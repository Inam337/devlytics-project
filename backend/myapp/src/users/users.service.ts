import { Injectable } from '@nestjs/common';
import { MembershipStatus, Prisma, User } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../database/prisma.service';
import { NotificationEvent } from '../notifications/notification-events';
import { NotificationsService } from '../notifications/notifications.service';
import type { ActorContext } from '../organizations/organizations.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UsersRepository } from './users.repository';

/** Public projection of a user. Password hashes never leave this service. */
export interface UserView {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  employeeCode: string | null;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: UsersRepository,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Strips credentials and derives the display name used across the UI. */
  static toView(user: User): UserView {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      avatarUrl: user.avatarUrl,
      jobTitle: user.jobTitle,
      employeeCode: user.employeeCode,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  async findAll(organizationId: string, query: UserQueryDto) {
    const page = await this.repository.paginateMembers(organizationId, query);
    return page.map((membership) => ({
      ...UsersService.toView(membership.user),
      membershipId: membership.id,
      membershipStatus: membership.status,
      role: membership.role,
      joinedAt: membership.joinedAt,
    }));
  }

  async findOne(organizationId: string, userId: string) {
    const membership = await this.prisma.organizationUser.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      include: {
        user: {
          include: {
            teamMemberships: { include: { team: { select: { id: true, name: true, code: true } } } },
            gitAccounts: {
              select: { id: true, username: true, classification: true, providerId: true },
            },
          },
        },
        role: { select: { id: true, key: true, name: true } },
      },
    });
    if (!membership) throw AppException.notFound('User', userId);

    return {
      ...UsersService.toView(membership.user),
      membershipId: membership.id,
      membershipStatus: membership.status,
      role: membership.role,
      joinedAt: membership.joinedAt,
      teams: membership.user.teamMemberships.map((entry) => entry.team),
      gitIdentities: membership.user.gitAccounts,
    };
  }

  /**
   * Invites a person into the organization. An existing global identity is
   * reused so the same person keeps one login across organizations.
   */
  async invite(organizationId: string, dto: CreateUserDto, actor: ActorContext) {
    const role = await this.prisma.role.findUnique({
      where: { organizationId_key: { organizationId, key: dto.roleKey } },
    });
    if (!role) throw AppException.notFound('Role', dto.roleKey);

    if (dto.teamId) {
      const team = await this.prisma.team.findFirst({
        where: { id: dto.teamId, organizationId },
        select: { id: true },
      });
      if (!team) throw AppException.notFound('Team', dto.teamId);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email: dto.email } });

      if (existing) {
        const membership = await tx.organizationUser.findUnique({
          where: { organizationId_userId: { organizationId, userId: existing.id } },
        });
        if (membership && membership.status !== 'REMOVED') {
          throw AppException.duplicate('User', 'email in this organization');
        }
      }

      const user =
        existing ??
        (await tx.user.create({
          data: {
            email: dto.email,
            firstName: dto.firstName,
            lastName: dto.lastName,
            jobTitle: dto.jobTitle,
            employeeCode: dto.employeeCode,
            avatarUrl: dto.avatarUrl,
            status: 'INVITED',
          },
        }));

      const membership = await tx.organizationUser.upsert({
        where: { organizationId_userId: { organizationId, userId: user.id } },
        update: { roleId: role.id, status: 'INVITED', invitedAt: new Date() },
        create: {
          organizationId,
          userId: user.id,
          roleId: role.id,
          status: 'INVITED',
          invitedAt: new Date(),
        },
      });

      if (dto.teamId) {
        await tx.teamMember.upsert({
          where: { teamId_userId: { teamId: dto.teamId, userId: user.id } },
          update: {},
          create: { organizationId, teamId: dto.teamId, userId: user.id },
        });
      }

      return { user, membership };
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'USER',
      action: 'user.invited',
      summary: `Invited ${dto.email} as ${dto.roleKey}`,
      entityType: 'User',
      entityId: result.user.id,
      after: { email: dto.email, roleKey: dto.roleKey, teamId: dto.teamId },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    await this.notifications.notify({
      organizationId,
      userId: result.user.id,
      event: NotificationEvent.DEVELOPER_INVITATION,
      title: 'You have been invited to Devlytics',
      body: `You were invited as ${dto.roleKey.replace(/_/g, ' ').toLowerCase()}. Set a password to activate your account.`,
      actionUrl: '/accept-invitation',
    });

    return {
      ...UsersService.toView(result.user),
      membershipId: result.membership.id,
      membershipStatus: result.membership.status,
      role: { id: role.id, key: role.key, name: role.name },
    };
  }

  async update(organizationId: string, userId: string, dto: UpdateUserDto, actor: ActorContext) {
    const membership = await this.repository.findMembership(organizationId, userId);
    if (!membership) throw AppException.notFound('User', userId);

    const before = {
      firstName: membership.user.firstName,
      lastName: membership.user.lastName,
      jobTitle: membership.user.jobTitle,
      status: membership.user.status,
      roleKey: membership.role.key,
      membershipStatus: membership.status,
    };

    let roleId: string | undefined;
    if (dto.roleKey && dto.roleKey !== membership.role.key) {
      const role = await this.prisma.role.findUnique({
        where: { organizationId_key: { organizationId, key: dto.roleKey } },
      });
      if (!role) throw AppException.notFound('Role', dto.roleKey);
      roleId = role.id;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
          ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
          ...(dto.jobTitle !== undefined ? { jobTitle: dto.jobTitle } : {}),
          ...(dto.employeeCode !== undefined ? { employeeCode: dto.employeeCode } : {}),
          ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
        },
      });

      if (roleId || dto.membershipStatus) {
        await tx.organizationUser.update({
          where: { id: membership.id },
          data: {
            ...(roleId ? { roleId } : {}),
            ...(dto.membershipStatus ? { status: dto.membershipStatus } : {}),
          },
        });
      }

      if (dto.teamId) {
        await tx.teamMember.upsert({
          where: { teamId_userId: { teamId: dto.teamId, userId } },
          update: {},
          create: { organizationId, teamId: dto.teamId, userId },
        });
      }

      return user;
    });

    // Permission changes are audit-logged with before/after scope (docs §2.2).
    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: dto.roleKey ? 'ROLE' : 'USER',
      action: dto.roleKey ? 'user.role_changed' : 'user.updated',
      summary: dto.roleKey
        ? `Role for ${membership.user.email} changed from ${before.roleKey} to ${dto.roleKey}`
        : `User ${membership.user.email} updated`,
      entityType: 'User',
      entityId: userId,
      before,
      after: {
        firstName: updated.firstName,
        lastName: updated.lastName,
        jobTitle: updated.jobTitle,
        status: updated.status,
        roleKey: dto.roleKey ?? before.roleKey,
        membershipStatus: dto.membershipStatus ?? before.membershipStatus,
      },
      reason: dto.reason,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return this.findOne(organizationId, userId);
  }

  /**
   * Removes the person from this organization. The global identity and all
   * historical measurements are retained — engineering history is never deleted.
   */
  async remove(organizationId: string, userId: string, actor: ActorContext) {
    const membership = await this.repository.findMembership(organizationId, userId);
    if (!membership) throw AppException.notFound('User', userId);

    await this.prisma.$transaction([
      this.prisma.organizationUser.update({
        where: { id: membership.id },
        data: { status: MembershipStatus.REMOVED },
      }),
      this.prisma.teamMember.deleteMany({ where: { organizationId, userId } }),
    ]);

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'USER',
      action: 'user.removed',
      summary: `${membership.user.email} removed from the organization`,
      entityType: 'User',
      entityId: userId,
      before: { membershipStatus: membership.status },
      after: { membershipStatus: MembershipStatus.REMOVED },
      reason: actor.reason,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { id: userId, membershipStatus: MembershipStatus.REMOVED };
  }

  /**
   * Suspends anyone with no commits, reviews or logins for the configured
   * number of days (docs/devlytics.md §3.1). Historical scores are preserved;
   * only current-period ranking eligibility is affected.
   */
  async suspendInactive(organizationId: string, inactivityDays: number): Promise<string[]> {
    const cutoff = new Date(Date.now() - inactivityDays * 24 * 60 * 60 * 1000);

    const candidates = await this.prisma.organizationUser.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        user: {
          OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: cutoff } }],
          AND: [{ OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: cutoff } }] }],
        },
      },
      include: { user: { select: { id: true, email: true, createdAt: true } } },
    });

    const suspended: string[] = [];
    for (const membership of candidates) {
      // Never suspend an account that has not had the full window to be active.
      if (membership.user.createdAt > cutoff) continue;

      const recentActivity = await this.prisma.developerDailyMetric.count({
        where: { organizationId, userId: membership.userId, metricDate: { gte: cutoff } },
      });
      if (recentActivity > 0) continue;

      await this.prisma.$transaction([
        this.prisma.user.update({ where: { id: membership.userId }, data: { status: 'SUSPENDED' } }),
        this.prisma.organizationUser.update({
          where: { id: membership.id },
          data: { status: 'SUSPENDED' },
        }),
      ]);

      await this.audit.record({
        organizationId,
        category: 'USER',
        action: 'user.auto_suspended',
        summary: `${membership.user.email} suspended after ${inactivityDays} days without commits, reviews or logins`,
        entityType: 'User',
        entityId: membership.userId,
        before: { status: 'ACTIVE' },
        after: { status: 'SUSPENDED' },
        reason: 'Automatic inactivity suspension',
      });

      suspended.push(membership.userId);
    }

    return suspended;
  }

  /** Records sign-in activity; also feeds the inactivity-suspension rule. */
  touchLogin(userId: string): Promise<User> {
    const now = new Date();
    return this.repository.updateUser(userId, { lastLoginAt: now, lastActiveAt: now });
  }

  createUserRecord(data: Prisma.UserCreateInput, tx?: Prisma.TransactionClient) {
    return this.repository.createUser(data, tx);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { AppException } from '../common/exceptions/app.exception';
import { addedToTeamMail } from '../common/mail-templates/transactional.templates';
import { MailService } from '../common/services/mail.service';
import { NumberUtil } from '../common/utils/number.util';
import { QueryUtil } from '../common/utils/query.util';
import { PrismaService } from '../database/prisma.service';
import { NotificationEvent } from '../notifications/notification-events';
import { NotificationsService } from '../notifications/notifications.service';
import type { ActorContext } from '../organizations/organizations.service';
import {
  AddTeamMemberDto,
  CreateTeamDto,
  TeamQueryDto,
  UpdateTeamDto,
} from './dto/team.dto';
import {
  TEAM_INCLUDE,
  TeamWithRelations,
  TeamsRepository,
} from './teams.repository';

const SORTABLE = ['name', 'code', 'createdAt', 'status'] as const;

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: TeamsRepository,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async findAll(organizationId: string, query: TeamQueryDto) {
    const where: Prisma.TeamWhereInput = {
      organizationId,
      ...QueryUtil.compact({
        departmentId: query.departmentId,
        status: query.status,
      }),
      ...QueryUtil.search(query.search, ['name', 'code']),
    };

    const [teams, total] = await this.prisma.$transaction([
      this.prisma.team.findMany({
        where,
        orderBy: QueryUtil.orderBy(
          query.sortBy,
          query.sortOrder,
          SORTABLE,
          'name',
        ),
        skip: query.skip,
        take: query.limit,
        include: TEAM_INCLUDE,
      }),
      this.prisma.team.count({ where }),
    ]);

    const withScores = await this.attachCurrentScores(organizationId, teams);
    return PaginatedResult.from(withScores, total, query);
  }

  async findOne(organizationId: string, id: string) {
    const team = await this.prisma.team.findFirst({
      where: { id, organizationId },
      include: {
        ...TEAM_INCLUDE,
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                jobTitle: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        projectTeams: {
          include: {
            project: {
              select: { id: true, name: true, code: true, status: true },
            },
          },
        },
        repositories: {
          select: {
            id: true,
            name: true,
            fullName: true,
            syncStatus: true,
            language: true,
          },
        },
      },
    });
    if (!team) throw AppException.notFound('Team', id);

    const [view] = await this.attachCurrentScores(organizationId, [team]);
    return {
      ...view,
      members: team.members.map((member) => ({
        ...member.user,
        membershipId: member.id,
        positionTitle: member.positionTitle,
        isLead: member.isLead,
        joinedAt: member.joinedAt,
      })),
      projects: team.projectTeams.map((entry) => entry.project),
      repositories: team.repositories,
    };
  }

  async create(
    organizationId: string,
    dto: CreateTeamDto,
    actor: ActorContext,
  ) {
    const code = dto.code.toUpperCase();
    if (await this.repository.findByCode(organizationId, code)) {
      throw AppException.duplicate('Team', 'code');
    }
    await this.assertReferences(
      organizationId,
      dto.departmentId,
      dto.teamLeadId,
    );
    assertAvatar(dto.avatarType, dto.avatarUrl);

    const team = await this.prisma.$transaction(async (tx) => {
      const created = await tx.team.create({
        data: {
          organizationId,
          name: dto.name,
          code,
          description: dto.description,
          departmentId: dto.departmentId,
          teamLeadId: dto.teamLeadId,
          avatarType: dto.avatarType ?? 'INITIALS',
          avatarUrl: dto.avatarUrl,
          teamColor: dto.teamColor ?? '#372b73',
        },
        include: TEAM_INCLUDE,
      });

      // The lead is always a member of their own team.
      if (dto.teamLeadId) {
        await tx.teamMember.create({
          data: {
            organizationId,
            teamId: created.id,
            userId: dto.teamLeadId,
            isLead: true,
          },
        });
      }

      return created;
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'TEAM',
      action: 'team.created',
      summary: `Team '${team.name}' (${team.code}) created`,
      entityType: 'Team',
      entityId: team.id,
      after: { name: team.name, code: team.code, teamLeadId: team.teamLeadId },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return this.findOne(organizationId, team.id);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateTeamDto,
    actor: ActorContext,
  ) {
    const existing = await this.repository.findByIdOrFail(organizationId, id);
    const code = dto.code?.toUpperCase();

    if (code && code !== existing.code) {
      const clash = await this.repository.findByCode(organizationId, code);
      if (clash) throw AppException.duplicate('Team', 'code');
    }
    await this.assertReferences(
      organizationId,
      dto.departmentId,
      dto.teamLeadId,
    );
    assertAvatar(
      dto.avatarType ?? existing.avatarType,
      dto.avatarUrl ?? existing.avatarUrl,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.team.update({
        where: { id },
        data: QueryUtil.compact({
          name: dto.name,
          code,
          description: dto.description,
          departmentId: dto.departmentId,
          teamLeadId: dto.teamLeadId,
          avatarType: dto.avatarType,
          avatarUrl: dto.avatarUrl,
          teamColor: dto.teamColor,
          status: dto.status,
        }),
      });

      if (dto.teamLeadId && dto.teamLeadId !== existing.teamLeadId) {
        await tx.teamMember.updateMany({
          where: { teamId: id },
          data: { isLead: false },
        });
        await tx.teamMember.upsert({
          where: { teamId_userId: { teamId: id, userId: dto.teamLeadId } },
          update: { isLead: true },
          create: {
            organizationId,
            teamId: id,
            userId: dto.teamLeadId,
            isLead: true,
          },
        });
      }
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'TEAM',
      action: 'team.updated',
      summary: `Team '${existing.name}' updated`,
      entityType: 'Team',
      entityId: id,
      before: {
        name: existing.name,
        code: existing.code,
        teamLeadId: existing.teamLeadId,
        status: existing.status,
      },
      after: QueryUtil.compact({
        name: dto.name,
        code,
        teamLeadId: dto.teamLeadId,
        status: dto.status,
      }),
      reason: dto.reason ?? actor.reason,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return this.findOne(organizationId, id);
  }

  /**
   * Archives rather than deletes when the team owns repositories, so measured
   * history stays attached to something.
   */
  async remove(organizationId: string, id: string, actor: ActorContext) {
    const team = await this.prisma.team.findFirst({
      where: { id, organizationId },
      include: {
        _count: { select: { repositories: true, projectTeams: true } },
      },
    });
    if (!team) throw AppException.notFound('Team', id);

    const hasHistory =
      team._count.repositories > 0 || team._count.projectTeams > 0;

    if (hasHistory) {
      await this.prisma.team.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      });
    } else {
      await this.prisma.team.delete({ where: { id } });
    }

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'TEAM',
      action: hasHistory ? 'team.archived' : 'team.deleted',
      summary: hasHistory
        ? `Team '${team.name}' archived (it still owns repositories or projects)`
        : `Team '${team.name}' deleted`,
      entityType: 'Team',
      entityId: id,
      before: { name: team.name, status: team.status },
      after: { status: hasHistory ? 'ARCHIVED' : 'DELETED' },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { id, deleted: !hasHistory, archived: hasHistory };
  }

  async findMembers(organizationId: string, teamId: string) {
    await this.repository.findByIdOrFail(organizationId, teamId);
    const members = await this.prisma.teamMember.findMany({
      where: { organizationId, teamId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            jobTitle: true,
            status: true,
          },
        },
      },
      orderBy: [{ isLead: 'desc' }, { joinedAt: 'asc' }],
    });

    return members.map((member) => ({
      ...member.user,
      membershipId: member.id,
      positionTitle: member.positionTitle,
      isLead: member.isLead,
      joinedAt: member.joinedAt,
    }));
  }

  async addMember(
    organizationId: string,
    teamId: string,
    dto: AddTeamMemberDto,
    actor: ActorContext,
  ) {
    const team = await this.repository.findByIdOrFail(organizationId, teamId);
    await this.assertOrganizationMember(organizationId, dto.userId);

    const existing = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: dto.userId } },
    });
    if (existing) throw AppException.duplicate('Team member', 'user');

    await this.prisma.teamMember.create({
      data: {
        organizationId,
        teamId,
        userId: dto.userId,
        positionTitle: dto.positionTitle,
        isLead: team.teamLeadId === dto.userId,
      },
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'TEAM',
      action: 'team.member_added',
      summary: `User added to team '${team.name}'`,
      entityType: 'Team',
      entityId: teamId,
      after: { userId: dto.userId, positionTitle: dto.positionTitle },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    await this.notifications.notify({
      organizationId,
      userId: dto.userId,
      event: NotificationEvent.ADDED_TO_TEAM,
      title: `You joined ${team.name}`,
      body: `You were added to the team ${team.name} (${team.code}).`,
      actionUrl: `/teams/${teamId}`,
    });

    const member = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { email: true, firstName: true },
    });
    if (member) {
      const appUrl = this.config.get<string>(
        'app.url',
        'http://localhost:3000',
      );
      // Never throws (WOR-13) — a mail outage must not fail the add-member request.
      const teamMail = await this.mail.sendTemplate(
        member.email,
        addedToTeamMail({
          recipientFirstName: member.firstName,
          teamName: team.name,
          teamCode: team.code,
          positionTitle: dto.positionTitle,
          ctaUrl: `${appUrl}/teams/${teamId}`,
        }),
      );
      if (!teamMail.success) {
        this.logger.warn(
          `Added-to-team email failed for ${member.email}: ${teamMail.error}`,
        );
      }
    }

    return this.findMembers(organizationId, teamId);
  }

  async removeMember(
    organizationId: string,
    teamId: string,
    userId: string,
    actor: ActorContext,
  ) {
    const team = await this.repository.findByIdOrFail(organizationId, teamId);
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!membership) throw AppException.notFound('Team member', userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.teamMember.delete({ where: { id: membership.id } });
      if (team.teamLeadId === userId) {
        await tx.team.update({
          where: { id: teamId },
          data: { teamLeadId: null },
        });
      }
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'TEAM',
      action: 'team.member_removed',
      summary: `User removed from team '${team.name}'`,
      entityType: 'Team',
      entityId: teamId,
      before: { userId, isLead: membership.isLead },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { teamId, userId, removed: true };
  }

  /**
   * Attaches the latest persisted score and rank. Scores are read, never
   * recomputed here — `ScoringService` owns the formula.
   */
  private async attachCurrentScores(
    organizationId: string,
    teams: TeamWithRelations[],
  ) {
    if (teams.length === 0) return [];
    const teamIds = teams.map((team) => team.id);

    const [scores, rankings] = await Promise.all([
      this.prisma.teamScore.findMany({
        where: { organizationId, teamId: { in: teamIds } },
        orderBy: [{ periodStart: 'desc' }, { computedAt: 'desc' }],
      }),
      this.prisma.rankingHistory.findMany({
        where: { organizationId, subjectType: 'TEAM', teamId: { in: teamIds } },
        orderBy: { periodStart: 'desc' },
      }),
    ]);

    const latestScore = new Map<string, (typeof scores)[number]>();
    for (const score of scores)
      if (!latestScore.has(score.teamId)) latestScore.set(score.teamId, score);

    const latestRank = new Map<string, (typeof rankings)[number]>();
    for (const rank of rankings) {
      if (rank.teamId && !latestRank.has(rank.teamId))
        latestRank.set(rank.teamId, rank);
    }

    return teams.map((team) => {
      const { _count, ...rest } = team;
      const score = latestScore.get(team.id);
      const rank = latestRank.get(team.id);
      return {
        ...rest,
        memberCount: _count.members,
        projectCount: _count.projectTeams,
        repositoryCount: _count.repositories,
        currentScore: score ? NumberUtil.toNumber(score.totalScore) : null,
        scoreFreshness: score?.freshness ?? null,
        currentRank: rank?.rank ?? null,
        rankDelta: rank?.rankDelta ?? 0,
      };
    });
  }

  private async assertReferences(
    organizationId: string,
    departmentId?: string,
    leadId?: string,
  ) {
    if (departmentId) {
      const department = await this.prisma.department.findFirst({
        where: { id: departmentId, organizationId },
        select: { id: true },
      });
      if (!department) throw AppException.notFound('Department', departmentId);
    }
    if (leadId) await this.assertOrganizationMember(organizationId, leadId);
  }

  private async assertOrganizationMember(
    organizationId: string,
    userId: string,
  ) {
    const membership = await this.prisma.organizationUser.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: { status: true },
    });
    if (!membership || membership.status === 'REMOVED') {
      throw AppException.unprocessable(
        'That user is not a member of this organization',
      );
    }
  }
}

/** An IMAGE or ICON avatar needs a URL; INITIALS is generated from the name. */
function assertAvatar(
  avatarType?: string | null,
  avatarUrl?: string | null,
): void {
  if ((avatarType === 'IMAGE' || avatarType === 'ICON') && !avatarUrl) {
    throw AppException.badRequest(
      `avatarUrl is required when avatarType is ${avatarType}`,
    );
  }
}

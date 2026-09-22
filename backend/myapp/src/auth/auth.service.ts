import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoleKey } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ErrorCode } from '../common/constants/error-codes';
import type { ClientInfo } from '../common/decorators';
import { AppException } from '../common/exceptions/app.exception';
import {
  organizationCreatedMail,
  passwordResetMail,
} from '../common/mail-templates/transactional.templates';
import { CryptoService } from '../common/services/crypto.service';
import { MailService } from '../common/services/mail.service';
import { PrismaService } from '../database/prisma.service';
import { NotificationEvent } from '../notifications/notification-events';
import { NotificationsService } from '../notifications/notifications.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsersRepository } from '../users/users.repository';
import { UsersService } from '../users/users.service';
import {
  AcceptInvitationDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { TokenPair, TokenService } from './token.service';

export interface AuthSession extends TokenPair {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    avatarUrl: string | null;
    status: string;
  };
  organization: { id: string; name: string; slug: string };
  role: { id: string; key: RoleKey; name: string };
  permissions: string[];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersRepository,
    private readonly usersService: UsersService,
    private readonly organizations: OrganizationsService,
    private readonly tokens: TokenService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  /** Base URL emails link back into the app with — never hardcoded (docs §8). */
  private appUrl(): string {
    return this.config.get<string>('app.url', 'http://localhost:3000');
  }

  /**
   * Creates the organization and its first Organization Admin in one
   * transaction — a tenant is never left without an administrator.
   */
  async register(dto: RegisterDto, client: ClientInfo): Promise<AuthSession> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing?.passwordHash) {
      throw AppException.duplicate('User', 'email');
    }

    const passwordHash = await this.crypto.hashPassword(dto.password);
    const organization = await this.organizations.create(dto.organization, {
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
    });

    const { user, membership } = await this.prisma.$transaction(async (tx) => {
      const adminRole = await tx.role.findUniqueOrThrow({
        where: {
          organizationId_key: {
            organizationId: organization.id,
            key: RoleKey.ORGANIZATION_ADMIN,
          },
        },
      });

      const account = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: {
              passwordHash,
              firstName: dto.firstName,
              lastName: dto.lastName,
              status: 'ACTIVE',
            },
          })
        : await tx.user.create({
            data: {
              email: dto.email,
              firstName: dto.firstName,
              lastName: dto.lastName,
              passwordHash,
              status: 'ACTIVE',
            },
          });

      const orgUser = await tx.organizationUser.create({
        data: {
          organizationId: organization.id,
          userId: account.id,
          roleId: adminRole.id,
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      });

      return { user: account, membership: orgUser, role: adminRole };
    });

    await this.audit.record({
      organizationId: organization.id,
      actorId: user.id,
      category: 'AUTH',
      action: 'auth.registered',
      summary: `${user.email} registered and became the organization admin`,
      entityType: 'User',
      entityId: user.id,
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
    });

    await this.notifications.notify({
      organizationId: organization.id,
      userId: user.id,
      event: NotificationEvent.ORGANIZATION_CREATED,
      title: `${organization.name} is ready`,
      body: 'Connect a Git provider and import repositories to start collecting engineering evidence.',
      actionUrl: '/onboarding',
    });

    // Never throws (WOR-13) — a mail outage must not fail registration.
    const orgCreatedMail = await this.mail.sendTemplate(
      user.email,
      organizationCreatedMail({
        recipientFirstName: user.firstName,
        organizationName: organization.name,
        organizationSlug: organization.slug,
        ctaUrl: `${this.appUrl()}/onboarding`,
      }),
    );
    if (!orgCreatedMail.success) {
      this.logger.warn(
        `Organization-created email failed for ${user.email}: ${orgCreatedMail.error}`,
      );
    }

    void membership;
    return this.buildSession(user.id, organization.id, client);
  }

  async login(dto: LoginDto, client: ClientInfo): Promise<AuthSession> {
    const user = await this.users.findByEmail(dto.email);

    // Same response for unknown account and wrong password — no account enumeration.
    if (!user?.passwordHash) {
      throw new AppException(
        'Invalid email or password',
        ErrorCode.INVALID_CREDENTIALS,
        401,
      );
    }

    const matches = await this.crypto.comparePassword(
      dto.password,
      user.passwordHash,
    );
    if (!matches) {
      throw new AppException(
        'Invalid email or password',
        ErrorCode.INVALID_CREDENTIALS,
        401,
      );
    }

    if (user.status === 'SUSPENDED') {
      throw AppException.forbidden(
        'This account is suspended. Contact an organization admin.',
      );
    }

    const membership = dto.organizationId
      ? await this.users.findMembership(dto.organizationId, user.id)
      : await this.users.findPrimaryMembership(user.id);

    if (!membership || membership.status === 'REMOVED') {
      throw AppException.forbidden(
        'This account does not belong to an active organization',
      );
    }
    if (membership.status === 'SUSPENDED') {
      throw AppException.forbidden(
        'Your membership of this organization is suspended',
      );
    }

    // First sign-in after an invitation activates the membership.
    if (membership.status === 'INVITED') {
      await this.prisma.organizationUser.update({
        where: { id: membership.id },
        data: { status: 'ACTIVE', joinedAt: new Date() },
      });
    }

    await this.usersService.touchLogin(user.id);

    await this.audit.record({
      organizationId: membership.organizationId,
      actorId: user.id,
      category: 'AUTH',
      action: 'auth.login',
      summary: `${user.email} signed in`,
      entityType: 'User',
      entityId: user.id,
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
    });

    return this.buildSession(user.id, membership.organizationId, client);
  }

  /** Rotates the refresh token: the presented one is revoked as it is exchanged. */
  async refresh(
    dto: RefreshTokenDto,
    client: ClientInfo,
  ): Promise<AuthSession> {
    const payload = await this.tokens.verifyRefreshToken(dto.refreshToken);
    const membership = await this.users.findMembership(
      payload.organizationId,
      payload.sub,
    );

    if (
      !membership ||
      membership.status === 'REMOVED' ||
      membership.status === 'SUSPENDED'
    ) {
      await this.tokens.revokeFamily(payload.familyId);
      throw AppException.unauthorized('This session is no longer valid');
    }

    const session = await this.buildSession(
      payload.sub,
      payload.organizationId,
      client,
      payload.familyId,
    );

    // The successor token id is the jti embedded in the newly issued token.
    const successor = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.crypto.hashToken(session.refreshToken) },
      select: { id: true },
    });
    await this.tokens.rotate(dto.refreshToken, successor?.id ?? payload.jti);

    return session;
  }

  async logout(
    refreshToken: string | undefined,
    userId: string,
    organizationId: string,
  ) {
    if (refreshToken) {
      await this.tokens.revoke(refreshToken);
    } else {
      await this.tokens.revokeAllForUser(userId);
    }

    await this.audit.record({
      organizationId,
      actorId: userId,
      category: 'AUTH',
      action: 'auth.logout',
      summary: 'Session ended',
      entityType: 'User',
      entityId: userId,
    });

    return { loggedOut: true };
  }

  async me(organizationId: string, userId: string) {
    const membership = await this.users.findMembership(organizationId, userId);
    if (!membership) throw AppException.unauthorized();

    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        timezone: true,
        dateFormat: true,
        activeWeightVersion: true,
        onboardingState: true,
      },
    });

    const teams = await this.prisma.teamMember.findMany({
      where: { organizationId, userId },
      select: {
        team: { select: { id: true, name: true, code: true, teamColor: true } },
      },
    });

    return {
      user: UsersService.toView(membership.user),
      organization,
      role: {
        id: membership.role.id,
        key: membership.role.key,
        name: membership.role.name,
      },
      permissions: membership.role.permissions
        .map((entry) => entry.permission.key)
        .sort(),
      teams: teams.map((entry) => entry.team),
    };
  }

  /**
   * Always reports success so the endpoint cannot be used to discover which
   * addresses have accounts. The token is returned only outside production,
   * where no mail transport is wired up.
   */
  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<{ requested: true; resetToken?: string }> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) return { requested: true };

    const minutes = this.config.get<number>(
      'jwt.passwordResetExpiresMinutes',
      30,
    );
    const token = this.crypto.generateToken();

    await this.prisma.$transaction([
      // A new request invalidates any outstanding link.
      this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.crypto.hashToken(token),
          expiresAt: new Date(Date.now() + minutes * 60 * 1000),
        },
      }),
    ]);

    const membership = await this.users.findPrimaryMembership(user.id);
    if (membership) {
      // In-app row only — the dedicated password-reset email below (with the
      // actual single-use link) replaces the generic EMAIL-channel fan-out
      // the notifications processor would otherwise send for this event.
      await this.notifications.notify({
        organizationId: membership.organizationId,
        userId: user.id,
        event: NotificationEvent.PASSWORD_RESET,
        title: 'Reset your Devlytics password',
        body: `A password reset was requested. The link expires in ${minutes} minutes.`,
      });
    }

    // Never throws (WOR-13) — a mail outage must not fail the forgot-password request.
    const resetMail = await this.mail.sendTemplate(
      user.email,
      passwordResetMail({
        recipientFirstName: user.firstName,
        expiresInMinutes: minutes,
        ctaUrl: `${this.appUrl()}/reset-password?token=${encodeURIComponent(token)}`,
      }),
    );
    if (!resetMail.success) {
      this.logger.warn(
        `Password-reset email failed for ${user.email}: ${resetMail.error}`,
      );
    }

    this.logger.log(`Password reset requested for ${user.email}`);

    return this.config.get<string>('app.env') === 'production'
      ? { requested: true }
      : { requested: true, resetToken: token };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ reset: true }> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.crypto.hashToken(dto.token) },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw AppException.badRequest(
        'This reset link is invalid or has expired',
      );
    }

    const passwordHash = await this.crypto.hashPassword(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, status: 'ACTIVE' },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // A password change ends every existing session.
    await this.tokens.revokeAllForUser(record.userId);

    const membership = await this.users.findPrimaryMembership(record.userId);
    if (membership) {
      await this.audit.record({
        organizationId: membership.organizationId,
        actorId: record.userId,
        category: 'AUTH',
        action: 'auth.password_reset',
        summary: 'Password reset completed; all sessions revoked',
        entityType: 'User',
        entityId: record.userId,
      });
    }

    return { reset: true };
  }

  async changePassword(
    organizationId: string,
    userId: string,
    dto: ChangePasswordDto,
    client: ClientInfo,
  ) {
    const user = await this.users.findById(userId);
    if (!user?.passwordHash) throw AppException.unauthorized();

    const matches = await this.crypto.comparePassword(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!matches) {
      throw new AppException(
        'Current password is incorrect',
        ErrorCode.INVALID_CREDENTIALS,
        401,
      );
    }
    if (dto.currentPassword === dto.newPassword) {
      throw AppException.badRequest(
        'The new password must differ from the current one',
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await this.crypto.hashPassword(dto.newPassword) },
    });
    await this.tokens.revokeAllForUser(userId);

    await this.audit.record({
      organizationId,
      actorId: userId,
      category: 'AUTH',
      action: 'auth.password_changed',
      summary: 'Password changed; all sessions revoked',
      entityType: 'User',
      entityId: userId,
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
    });

    return { changed: true };
  }

  /** Invitation acceptance: sets the first password and activates membership. */
  async acceptInvitation(
    dto: AcceptInvitationDto,
    client: ClientInfo,
  ): Promise<AuthSession> {
    const user = await this.users.findByEmail(dto.email);
    if (!user)
      throw AppException.badRequest('This invitation is no longer valid');

    const membership = await this.users.findMembership(
      dto.organizationId,
      user.id,
    );
    if (!membership || membership.status !== 'INVITED') {
      throw AppException.badRequest('This invitation is no longer valid');
    }
    if (user.passwordHash) {
      throw AppException.conflict(
        'This account already has a password — sign in instead',
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await this.crypto.hashPassword(dto.password),
          status: 'ACTIVE',
        },
      }),
      this.prisma.organizationUser.update({
        where: { id: membership.id },
        data: { status: 'ACTIVE', joinedAt: new Date() },
      }),
    ]);

    await this.audit.record({
      organizationId: dto.organizationId,
      actorId: user.id,
      category: 'AUTH',
      action: 'auth.invitation_accepted',
      summary: `${user.email} accepted their invitation`,
      entityType: 'User',
      entityId: user.id,
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
    });

    return this.buildSession(user.id, dto.organizationId, client);
  }

  /** Builds the token pair plus the identity payload every auth response returns. */
  private async buildSession(
    userId: string,
    organizationId: string,
    client: ClientInfo,
    familyId?: string,
  ): Promise<AuthSession> {
    const membership = await this.users.findMembership(organizationId, userId);
    if (!membership) throw AppException.unauthorized();

    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true },
    });

    const tokens = await this.tokens.issue({
      userId,
      email: membership.user.email,
      organizationId,
      roleKey: membership.role.key,
      familyId,
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
    });

    const view = UsersService.toView(membership.user);

    return {
      ...tokens,
      user: {
        id: view.id,
        email: view.email,
        firstName: view.firstName,
        lastName: view.lastName,
        fullName: view.fullName,
        avatarUrl: view.avatarUrl,
        status: view.status,
      },
      organization,
      role: {
        id: membership.role.id,
        key: membership.role.key,
        name: membership.role.name,
      },
      permissions: membership.role.permissions
        .map((entry) => entry.permission.key)
        .sort(),
    };
  }
}

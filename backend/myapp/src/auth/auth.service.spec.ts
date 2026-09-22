import type { ConfigService } from '@nestjs/config';
import { RoleKey } from '@prisma/client';
import type { AuditService } from '../audit/audit.service';
import type { MailService } from '../common/services/mail.service';
import type { PrismaService } from '../database/prisma.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { OrganizationsService } from '../organizations/organizations.service';
import type { UsersRepository } from '../users/users.repository';
import type { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import type { TokenService } from './token.service';

function configWith(values: Record<string, unknown>): ConfigService {
  return {
    get: (key: string, fallback?: unknown) =>
      key in values ? values[key] : fallback,
  } as unknown as ConfigService;
}

describe('AuthService email delivery (WOR-14)', () => {
  const membership = {
    id: 'membership-1',
    organizationId: 'org-1',
    userId: 'user-1',
    status: 'ACTIVE',
    user: {
      id: 'user-1',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      avatarUrl: null,
      status: 'ACTIVE',
    },
    role: {
      id: 'role-1',
      key: RoleKey.ORGANIZATION_ADMIN,
      name: 'Org Admin',
      permissions: [],
    },
  };

  let prisma: any;
  let users: any;
  let organizations: any;
  let tokens: any;
  let crypto: any;
  let audit: AuditService;
  let notifications: NotificationsService;
  let mail: { sendTemplate: jest.Mock };
  let config: ConfigService;
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return arg({
            role: {
              findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'role-1' }),
            },
            user: {
              create: jest.fn().mockResolvedValue(membership.user),
              update: jest.fn().mockResolvedValue(membership.user),
            },
            organizationUser: {
              create: jest.fn().mockResolvedValue(membership),
            },
          });
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
      organization: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'org-1',
          name: 'Acme Corp',
          slug: 'acme-corp',
        }),
      },
      passwordResetToken: {
        updateMany: jest.fn(),
        create: jest.fn(),
      },
    };

    users = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findMembership: jest.fn().mockResolvedValue(membership),
      findPrimaryMembership: jest.fn().mockResolvedValue(membership),
    };

    organizations = {
      create: jest.fn().mockResolvedValue({
        id: 'org-1',
        name: 'Acme Corp',
        slug: 'acme-corp',
      }),
    };

    tokens = {
      issue: jest.fn().mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: '15m',
        tokenType: 'Bearer',
      }),
    };

    crypto = {
      hashPassword: jest.fn().mockResolvedValue('hashed'),
      generateToken: jest.fn().mockReturnValue('reset-token'),
      hashToken: jest.fn().mockReturnValue('hashed-token'),
    };

    audit = { record: jest.fn() } as unknown as AuditService;
    notifications = { notify: jest.fn() } as unknown as NotificationsService;
    mail = { sendTemplate: jest.fn() };
    config = configWith({
      'jwt.passwordResetExpiresMinutes': 30,
      'app.url': 'https://app.devlytics.local',
      'app.env': 'development',
    });

    service = new AuthService(
      prisma as unknown as PrismaService,
      users as unknown as UsersRepository,
      { touchLogin: jest.fn() } as unknown as UsersService,
      organizations as unknown as OrganizationsService,
      tokens as unknown as TokenService,
      crypto,
      audit,
      notifications,
      config,
      mail as unknown as MailService,
    );
  });

  it('register() still returns a session when the organization-created email fails to send', async () => {
    mail.sendTemplate.mockResolvedValue({ success: false, error: 'SMTP down' });

    const result = await service.register(
      {
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        password: 'Str0ng!Passphrase',
        organization: { name: 'Acme Corp' } as any,
      },
      { ipAddress: '127.0.0.1', userAgent: 'jest' },
    );

    expect(mail.sendTemplate).toHaveBeenCalledWith(
      'ada@example.com',
      expect.objectContaining({
        subject: expect.stringContaining('Acme Corp'),
      }),
    );
    expect(result.accessToken).toBe('access');
  });

  it('register() sends the organization-created email to the new admin with an onboarding CTA', async () => {
    mail.sendTemplate.mockResolvedValue({ success: true });

    await service.register(
      {
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        password: 'Str0ng!Passphrase',
        organization: { name: 'Acme Corp' } as any,
      },
      { ipAddress: '127.0.0.1', userAgent: 'jest' },
    );

    expect(mail.sendTemplate).toHaveBeenCalledWith(
      'ada@example.com',
      expect.objectContaining({
        cta: {
          label: 'Go to onboarding',
          url: 'https://app.devlytics.local/onboarding',
        },
      }),
    );
  });

  it('forgotPassword() still reports success when the reset email fails to send', async () => {
    mail.sendTemplate.mockResolvedValue({ success: false, error: 'SMTP down' });
    users.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'ada@example.com',
      firstName: 'Ada',
    });

    const result = await service.forgotPassword({ email: 'ada@example.com' });

    expect(result.requested).toBe(true);
    expect(mail.sendTemplate).toHaveBeenCalledWith(
      'ada@example.com',
      expect.objectContaining({
        cta: expect.objectContaining({
          url: expect.stringContaining('/reset-password?token=reset-token'),
        }),
      }),
    );
  });

  it('forgotPassword() surfaces the configured expiry, not a hardcoded 30', async () => {
    config = configWith({
      'jwt.passwordResetExpiresMinutes': 45,
      'app.url': 'https://app.devlytics.local',
      'app.env': 'development',
    });
    service = new AuthService(
      prisma as unknown as PrismaService,
      users as unknown as UsersRepository,
      { touchLogin: jest.fn() } as unknown as UsersService,
      organizations as unknown as OrganizationsService,
      tokens as unknown as TokenService,
      crypto,
      audit,
      notifications,
      config,
      mail as unknown as MailService,
    );
    mail.sendTemplate.mockResolvedValue({ success: true });
    users.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'ada@example.com',
      firstName: 'Ada',
    });

    await service.forgotPassword({ email: 'ada@example.com' });

    expect(mail.sendTemplate).toHaveBeenCalledWith(
      'ada@example.com',
      expect.objectContaining({
        preheader: expect.stringContaining('45 minutes'),
      }),
    );
  });
});

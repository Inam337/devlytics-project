import { RoleKey } from '@prisma/client';
import type { ConfigService } from '@nestjs/config';
import type { AuditService } from '../audit/audit.service';
import type { MailService } from '../common/services/mail.service';
import type { PrismaService } from '../database/prisma.service';
import type { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from './users.service';
import type { UsersRepository } from './users.repository';

function configWith(values: Record<string, unknown>): ConfigService {
  return {
    get: (key: string, fallback?: unknown) =>
      key in values ? values[key] : fallback,
  } as unknown as ConfigService;
}

describe('UsersService#invite email delivery (WOR-14)', () => {
  const role = { id: 'role-1', key: RoleKey.DEVELOPER, name: 'Developer' };
  const invitedUser = {
    id: 'user-2',
    email: 'grace@example.com',
    firstName: 'Grace',
    lastName: 'Hopper',
  };

  let prisma: any;
  let notifications: NotificationsService;
  let mail: { sendTemplate: jest.Mock };
  let config: ConfigService;
  let service: UsersService;

  beforeEach(() => {
    prisma = {
      role: { findUnique: jest.fn().mockResolvedValue(role) },
      team: { findFirst: jest.fn() },
      organization: {
        findUnique: jest.fn().mockResolvedValue({ name: 'Acme Corp' }),
      },
      $transaction: jest.fn(async (fn: any) =>
        fn({
          user: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(invitedUser),
          },
          organizationUser: {
            findUnique: jest.fn().mockResolvedValue(null),
            upsert: jest
              .fn()
              .mockResolvedValue({ id: 'membership-2', status: 'INVITED' }),
          },
          teamMember: { upsert: jest.fn() },
        }),
      ),
    };

    notifications = { notify: jest.fn() } as unknown as NotificationsService;
    mail = { sendTemplate: jest.fn() };
    config = configWith({ 'app.url': 'https://app.devlytics.local' });

    service = new UsersService(
      prisma as unknown as PrismaService,
      {} as unknown as UsersRepository,
      { record: jest.fn() } as unknown as AuditService,
      notifications,
      mail as unknown as MailService,
      config,
    );
  });

  it('invite() still returns the created member when the invitation email fails to send', async () => {
    mail.sendTemplate.mockResolvedValue({ success: false, error: 'SMTP down' });

    const result = await service.invite(
      'org-1',
      {
        email: 'grace@example.com',
        firstName: 'Grace',
        lastName: 'Hopper',
        roleKey: RoleKey.DEVELOPER,
      },
      { actorId: 'actor-1' },
    );

    expect(mail.sendTemplate).toHaveBeenCalledWith(
      'grace@example.com',
      expect.objectContaining({
        subject: expect.stringContaining('Acme Corp'),
      }),
    );
    expect(result.email).toBe('grace@example.com');
  });

  it('invite() sends the developer-invitation email with the org, role and accept-invitation CTA', async () => {
    mail.sendTemplate.mockResolvedValue({ success: true });

    await service.invite(
      'org-1',
      {
        email: 'grace@example.com',
        firstName: 'Grace',
        lastName: 'Hopper',
        roleKey: RoleKey.DEVELOPER,
      },
      { actorId: 'actor-1' },
    );

    expect(mail.sendTemplate).toHaveBeenCalledWith(
      'grace@example.com',
      expect.objectContaining({
        list: expect.arrayContaining([
          { label: 'Organization', detail: 'Acme Corp' },
          { label: 'Role', detail: 'Developer' },
        ]),
        cta: expect.objectContaining({
          url: expect.stringContaining(
            '/accept-invitation?email=grace%40example.com',
          ),
        }),
      }),
    );
  });
});

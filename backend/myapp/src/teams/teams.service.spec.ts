import type { ConfigService } from '@nestjs/config';
import type { AuditService } from '../audit/audit.service';
import type { MailService } from '../common/services/mail.service';
import type { PrismaService } from '../database/prisma.service';
import type { NotificationsService } from '../notifications/notifications.service';
import { TeamsService } from './teams.service';
import type { TeamsRepository } from './teams.repository';

function configWith(values: Record<string, unknown>): ConfigService {
  return {
    get: (key: string, fallback?: unknown) =>
      key in values ? values[key] : fallback,
  } as unknown as ConfigService;
}

describe('TeamsService#addMember email delivery (WOR-14)', () => {
  const team = {
    id: 'team-1',
    name: 'Platform',
    code: 'PLT',
    teamLeadId: null,
  };
  const member = {
    id: 'user-2',
    email: 'rosalind@example.com',
    firstName: 'Rosalind',
  };

  let prisma: any;
  let repository: any;
  let notifications: NotificationsService;
  let mail: { sendTemplate: jest.Mock };
  let config: ConfigService;
  let service: TeamsService;

  beforeEach(() => {
    repository = { findByIdOrFail: jest.fn().mockResolvedValue(team) };
    prisma = {
      organizationUser: {
        findUnique: jest.fn().mockResolvedValue({ status: 'ACTIVE' }),
      },
      teamMember: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: { findUnique: jest.fn().mockResolvedValue(member) },
    };

    notifications = { notify: jest.fn() } as unknown as NotificationsService;
    mail = { sendTemplate: jest.fn() };
    config = configWith({ 'app.url': 'https://app.devlytics.local' });

    service = new TeamsService(
      prisma as unknown as PrismaService,
      repository as unknown as TeamsRepository,
      { record: jest.fn() } as unknown as AuditService,
      notifications,
      mail as unknown as MailService,
      config,
    );
  });

  it('addMember() still succeeds when the added-to-team email fails to send', async () => {
    mail.sendTemplate.mockResolvedValue({ success: false, error: 'SMTP down' });

    await expect(
      service.addMember(
        'org-1',
        'team-1',
        { userId: 'user-2', positionTitle: 'Backend Engineer' },
        { actorId: 'actor-1' },
      ),
    ).resolves.toBeDefined();

    expect(mail.sendTemplate).toHaveBeenCalledWith(
      'rosalind@example.com',
      expect.objectContaining({ subject: expect.stringContaining('Platform') }),
    );
  });

  it('addMember() sends the added-to-team email with the team CTA link', async () => {
    mail.sendTemplate.mockResolvedValue({ success: true });

    await service.addMember(
      'org-1',
      'team-1',
      { userId: 'user-2', positionTitle: 'Backend Engineer' },
      { actorId: 'actor-1' },
    );

    expect(mail.sendTemplate).toHaveBeenCalledWith(
      'rosalind@example.com',
      expect.objectContaining({
        cta: {
          label: 'View team',
          url: 'https://app.devlytics.local/teams/team-1',
        },
      }),
    );
  });
});

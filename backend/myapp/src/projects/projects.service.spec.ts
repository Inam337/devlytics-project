import type { ConfigService } from '@nestjs/config';
import type { AuditService } from '../audit/audit.service';
import type { MailService } from '../common/services/mail.service';
import type { PrismaService } from '../database/prisma.service';
import type { NotificationsService } from '../notifications/notifications.service';
import { ProjectsService } from './projects.service';

function configWith(values: Record<string, unknown>): ConfigService {
  return {
    get: (key: string, fallback?: unknown) =>
      key in values ? values[key] : fallback,
  } as unknown as ConfigService;
}

describe('ProjectsService#addMember email delivery (WOR-14)', () => {
  const project = {
    id: 'project-1',
    name: 'Orbit',
    code: 'ORB',
    status: 'ACTIVE',
    members: [],
    repositories: [],
    teams: [],
    progressPercent: 0,
    _count: { members: 0, repositories: 0 },
  };
  const member = {
    id: 'user-2',
    email: 'katherine@example.com',
    firstName: 'Katherine',
  };

  let prisma: any;
  let notifications: NotificationsService;
  let mail: { sendTemplate: jest.Mock };
  let config: ConfigService;
  let service: ProjectsService;

  beforeEach(() => {
    prisma = {
      project: { findFirst: jest.fn().mockResolvedValue(project) },
      organizationUser: {
        findUnique: jest.fn().mockResolvedValue({ status: 'ACTIVE' }),
      },
      projectMember: { upsert: jest.fn() },
      user: { findUnique: jest.fn().mockResolvedValue(member) },
      codeQualitySnapshot: { findMany: jest.fn().mockResolvedValue([]) },
    };

    notifications = { notify: jest.fn() } as unknown as NotificationsService;
    mail = { sendTemplate: jest.fn() };
    config = configWith({ 'app.url': 'https://app.devlytics.local' });

    service = new ProjectsService(
      prisma as unknown as PrismaService,
      { record: jest.fn() } as unknown as AuditService,
      notifications,
      mail as unknown as MailService,
      config,
    );
  });

  it('addMember() still succeeds when the assigned-to-project email fails to send', async () => {
    mail.sendTemplate.mockResolvedValue({ success: false, error: 'SMTP down' });

    await expect(
      service.addMember(
        'org-1',
        'project-1',
        { userId: 'user-2', roleLabel: 'Tech Lead', allocationPercent: 60 },
        { actorId: 'actor-1' },
      ),
    ).resolves.toBeDefined();

    expect(mail.sendTemplate).toHaveBeenCalledWith(
      'katherine@example.com',
      expect.objectContaining({ subject: expect.stringContaining('Orbit') }),
    );
  });

  it('addMember() sends the assigned-to-project email with the allocation metric and project CTA', async () => {
    mail.sendTemplate.mockResolvedValue({ success: true });

    await service.addMember(
      'org-1',
      'project-1',
      { userId: 'user-2', roleLabel: 'Tech Lead', allocationPercent: 60 },
      { actorId: 'actor-1' },
    );

    expect(mail.sendTemplate).toHaveBeenCalledWith(
      'katherine@example.com',
      expect.objectContaining({
        metricRows: [{ label: 'Allocation', value: '60%' }],
        cta: {
          label: 'View project',
          url: 'https://app.devlytics.local/projects/project-1',
        },
      }),
    );
  });
});

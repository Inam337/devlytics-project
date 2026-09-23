import type { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import type { AuditService } from '../audit/audit.service';
import type { MailService } from '../common/services/mail.service';
import type { PrismaService } from '../database/prisma.service';
import type { NotificationsService } from '../notifications/notifications.service';
import { NotificationEvent } from '../notifications/notification-events';
import { SyncService } from './sync.service';

describe('SyncService#markFailed', () => {
  let prisma: {
    syncJob: { update: jest.Mock; findMany: jest.Mock };
    repository: { findUnique: jest.Mock };
    organizationUser: { findMany: jest.Mock };
  };
  let notifications: { notifyMany: jest.Mock };
  let mail: { sendTemplate: jest.Mock };
  let service: SyncService;

  beforeEach(() => {
    prisma = {
      syncJob: {
        update: jest.fn().mockResolvedValue({
          organizationId: 'org-1',
          repositoryId: 'repo-1',
        }),
        findMany: jest.fn(),
      },
      repository: {
        findUnique: jest.fn().mockResolvedValue({ fullName: 'org/repo' }),
      },
      organizationUser: {
        findMany: jest.fn().mockResolvedValue([
          {
            userId: 'admin-1',
            user: { email: 'admin-1@example.com', firstName: 'Ada' },
          },
        ]),
      },
    };
    notifications = { notifyMany: jest.fn() };
    mail = { sendTemplate: jest.fn().mockResolvedValue({ success: true }) };
    service = new SyncService(
      prisma as unknown as PrismaService,
      { record: jest.fn() } as unknown as AuditService,
      notifications as unknown as NotificationsService,
      { add: jest.fn() } as unknown as Queue,
      mail as unknown as MailService,
      {
        get: jest.fn().mockReturnValue('http://localhost:3000'),
      } as unknown as ConfigService,
    );
  });

  it('does not alert admins on the first failure', async () => {
    prisma.syncJob.findMany.mockResolvedValue([{ status: 'FAILED' }]);

    await service.markFailed('job-1', 'boom');

    expect(notifications.notifyMany).not.toHaveBeenCalled();
    expect(mail.sendTemplate).not.toHaveBeenCalled();
  });

  it('alerts organization admins (in-app and email) exactly on the 2nd consecutive failure', async () => {
    prisma.syncJob.findMany.mockResolvedValue([
      { status: 'FAILED' },
      { status: 'FAILED' },
    ]);

    await service.markFailed('job-1', 'GitHub API rate limited');

    expect(notifications.notifyMany).toHaveBeenCalledWith([
      expect.objectContaining({
        organizationId: 'org-1',
        userId: 'admin-1',
        event: NotificationEvent.SYNC_FAILURE,
      }),
    ]);
    expect(mail.sendTemplate).toHaveBeenCalledTimes(1);
    expect(mail.sendTemplate).toHaveBeenCalledWith(
      'admin-1@example.com',
      expect.objectContaining({
        subject: expect.stringContaining('org/repo'),
      }),
    );
  });

  it('does not alert again on the 3rd consecutive failure of the same streak', async () => {
    prisma.syncJob.findMany.mockResolvedValue([
      { status: 'FAILED' },
      { status: 'FAILED' },
      { status: 'FAILED' },
    ]);

    await service.markFailed('job-1', 'still failing');

    expect(notifications.notifyMany).not.toHaveBeenCalled();
    expect(mail.sendTemplate).not.toHaveBeenCalled();
  });

  it('stops the streak at the first non-failed job (not truly consecutive)', async () => {
    prisma.syncJob.findMany.mockResolvedValue([
      { status: 'FAILED' },
      { status: 'COMPLETED' },
      { status: 'FAILED' },
    ]);

    await service.markFailed('job-1', 'boom');

    expect(notifications.notifyMany).not.toHaveBeenCalled();
    expect(mail.sendTemplate).not.toHaveBeenCalled();
  });

  it('never alerts on a mid-retry failure, even past the threshold, until the final attempt', async () => {
    prisma.syncJob.findMany.mockResolvedValue([
      { status: 'FAILED' },
      { status: 'FAILED' },
    ]);

    await service.markFailed('job-1', 'boom', false);

    expect(notifications.notifyMany).not.toHaveBeenCalled();
    expect(mail.sendTemplate).not.toHaveBeenCalled();
  });
});

import type { Queue } from 'bullmq';
import type { AuditService } from '../audit/audit.service';
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
        findMany: jest.fn().mockResolvedValue([{ userId: 'admin-1' }]),
      },
    };
    notifications = { notifyMany: jest.fn() };
    service = new SyncService(
      prisma as unknown as PrismaService,
      { record: jest.fn() } as unknown as AuditService,
      notifications as unknown as NotificationsService,
      { add: jest.fn() } as unknown as Queue,
    );
  });

  it('does not alert admins on the first failure', async () => {
    prisma.syncJob.findMany.mockResolvedValue([{ status: 'FAILED' }]);

    await service.markFailed('job-1', 'boom');

    expect(notifications.notifyMany).not.toHaveBeenCalled();
  });

  it('alerts organization admins once failures reach the threshold', async () => {
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
        channel: 'EMAIL',
      }),
    ]);
  });

  it('stops the streak at the first non-failed job (not truly consecutive)', async () => {
    prisma.syncJob.findMany.mockResolvedValue([
      { status: 'FAILED' },
      { status: 'COMPLETED' },
      { status: 'FAILED' },
    ]);

    await service.markFailed('job-1', 'boom');

    expect(notifications.notifyMany).not.toHaveBeenCalled();
  });

  it('never alerts on a mid-retry failure, even past the threshold, until the final attempt', async () => {
    prisma.syncJob.findMany.mockResolvedValue([
      { status: 'FAILED' },
      { status: 'FAILED' },
    ]);

    await service.markFailed('job-1', 'boom', false);

    expect(notifications.notifyMany).not.toHaveBeenCalled();
  });
});

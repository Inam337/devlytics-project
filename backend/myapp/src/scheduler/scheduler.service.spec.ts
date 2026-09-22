import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../database/prisma.service';
import type { SyncService } from '../sync/sync.service';
import { SchedulerService } from './scheduler.service';

describe('SchedulerService#reconcileWebhooks (WOR-9)', () => {
  let prisma: { repository: { findMany: jest.Mock } };
  let sync: { queueIncremental: jest.Mock };
  let config: { get: jest.Mock };
  let service: SchedulerService;

  beforeEach(() => {
    prisma = { repository: { findMany: jest.fn() } };
    sync = { queueIncremental: jest.fn() };
    config = { get: jest.fn().mockReturnValue(5) };

    service = new SchedulerService(
      prisma as unknown as PrismaService,
      sync as unknown as SyncService,
      config as unknown as ConfigService,
    );
  });

  it('does nothing when no repository is due for a poll', async () => {
    prisma.repository.findMany.mockResolvedValue([]);

    await service.reconcileWebhooks();

    expect(sync.queueIncremental).not.toHaveBeenCalled();
  });

  it('excludes disconnected, never-synced, and in-flight repositories from the query', async () => {
    prisma.repository.findMany.mockResolvedValue([]);

    await service.reconcileWebhooks();

    expect(prisma.repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isArchived: false,
          syncStatus: {
            notIn: ['DISCONNECTED', 'NEVER_SYNCED', 'QUEUED', 'SYNCING'],
          },
        }),
      }),
    );
  });

  it('groups due repositories by organization and queues one incremental sync per org', async () => {
    prisma.repository.findMany.mockResolvedValue([
      { id: 'repo-1', organizationId: 'org-1' },
      { id: 'repo-2', organizationId: 'org-1' },
      { id: 'repo-3', organizationId: 'org-2' },
    ]);
    sync.queueIncremental.mockResolvedValue([
      {
        id: 'job-1',
        repositoryId: 'repo-x',
        jobType: 'INCREMENTAL',
        status: 'QUEUED',
        queued: true,
      },
    ]);

    await service.reconcileWebhooks();

    expect(sync.queueIncremental).toHaveBeenCalledTimes(2);
    expect(sync.queueIncremental).toHaveBeenCalledWith('org-1', [
      'repo-1',
      'repo-2',
    ]);
    expect(sync.queueIncremental).toHaveBeenCalledWith('org-2', ['repo-3']);
  });

  it('logs and continues when queueing fails for one organization, without throwing', async () => {
    prisma.repository.findMany.mockResolvedValue([
      { id: 'repo-1', organizationId: 'org-1' },
      { id: 'repo-2', organizationId: 'org-2' },
    ]);
    sync.queueIncremental
      .mockRejectedValueOnce(new Error('db unavailable'))
      .mockResolvedValueOnce([
        {
          id: 'job-1',
          repositoryId: 'repo-2',
          jobType: 'INCREMENTAL',
          status: 'QUEUED',
          queued: true,
        },
      ]);

    await expect(service.reconcileWebhooks()).resolves.toBeUndefined();
    expect(sync.queueIncremental).toHaveBeenCalledTimes(2);
  });
});

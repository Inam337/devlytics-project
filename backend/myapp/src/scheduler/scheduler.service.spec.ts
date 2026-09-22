import type { ConfigService } from '@nestjs/config';
import type { GoalsService } from '../goals/goals.service';
import type { PrismaService } from '../database/prisma.service';
import type { SyncService } from '../sync/sync.service';
import type { UsersService } from '../users/users.service';
import { SchedulerService } from './scheduler.service';

describe('SchedulerService', () => {
  let prisma: {
    repository: { findMany: jest.Mock };
    organization: { findMany: jest.Mock };
  };
  let sync: { queueIncremental: jest.Mock };
  let users: { suspendInactive: jest.Mock };
  let goals: { sweepAtRisk: jest.Mock };
  let config: { get: jest.Mock };
  let service: SchedulerService;

  beforeEach(() => {
    prisma = {
      repository: { findMany: jest.fn() },
      organization: { findMany: jest.fn() },
    };
    sync = { queueIncremental: jest.fn() };
    users = { suspendInactive: jest.fn() };
    goals = { sweepAtRisk: jest.fn() };
    config = { get: jest.fn().mockReturnValue(5) };

    service = new SchedulerService(
      prisma as unknown as PrismaService,
      sync as unknown as SyncService,
      users as unknown as UsersService,
      goals as unknown as GoalsService,
      config as unknown as ConfigService,
    );
  });

  describe('reconcileWebhooks (WOR-9)', () => {
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

  describe('suspendInactiveUsers (WOR-10)', () => {
    it('does nothing when there are no organizations', async () => {
      prisma.organization.findMany.mockResolvedValue([]);

      await service.suspendInactiveUsers();

      expect(users.suspendInactive).not.toHaveBeenCalled();
    });

    it('sweeps every organization using the configured inactivity threshold', async () => {
      prisma.organization.findMany.mockResolvedValue([
        { id: 'org-1' },
        { id: 'org-2' },
      ]);
      config.get.mockReturnValue(90);
      users.suspendInactive
        .mockResolvedValueOnce(['user-1', 'user-2'])
        .mockResolvedValueOnce([]);

      await service.suspendInactiveUsers();

      expect(users.suspendInactive).toHaveBeenCalledWith('org-1', 90);
      expect(users.suspendInactive).toHaveBeenCalledWith('org-2', 90);
    });

    it('logs and continues when one organization fails, without throwing', async () => {
      prisma.organization.findMany.mockResolvedValue([
        { id: 'org-1' },
        { id: 'org-2' },
      ]);
      users.suspendInactive
        .mockRejectedValueOnce(new Error('db unavailable'))
        .mockResolvedValueOnce(['user-3']);

      await expect(service.suspendInactiveUsers()).resolves.toBeUndefined();
      expect(users.suspendInactive).toHaveBeenCalledTimes(2);
    });
  });

  describe('sweepAtRiskGoals (WOR-11)', () => {
    it('does nothing when there are no organizations', async () => {
      prisma.organization.findMany.mockResolvedValue([]);

      await service.sweepAtRiskGoals();

      expect(goals.sweepAtRisk).not.toHaveBeenCalled();
    });

    it('sweeps every organization using the configured at-risk threshold', async () => {
      prisma.organization.findMany.mockResolvedValue([
        { id: 'org-1' },
        { id: 'org-2' },
      ]);
      config.get.mockReturnValue(14);
      goals.sweepAtRisk
        .mockResolvedValueOnce(['goal-1', 'goal-2'])
        .mockResolvedValueOnce([]);

      await service.sweepAtRiskGoals();

      expect(goals.sweepAtRisk).toHaveBeenCalledWith('org-1', 14);
      expect(goals.sweepAtRisk).toHaveBeenCalledWith('org-2', 14);
    });

    it('logs and continues when one organization fails, without throwing', async () => {
      prisma.organization.findMany.mockResolvedValue([
        { id: 'org-1' },
        { id: 'org-2' },
      ]);
      goals.sweepAtRisk
        .mockRejectedValueOnce(new Error('db unavailable'))
        .mockResolvedValueOnce(['goal-3']);

      await expect(service.sweepAtRiskGoals()).resolves.toBeUndefined();
      expect(goals.sweepAtRisk).toHaveBeenCalledTimes(2);
    });
  });
});

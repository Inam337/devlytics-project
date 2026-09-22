import type { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import type { PrismaService } from '../database/prisma.service';
import type { GoalsService } from '../goals/goals.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { ReportsService } from '../reports/reports.service';
import type { SyncService } from '../sync/sync.service';
import type { UsersService } from '../users/users.service';
import { SchedulerService } from './scheduler.service';

describe('SchedulerService', () => {
  let prisma: {
    repository: { findMany: jest.Mock };
    organization: { findMany: jest.Mock };
    organizationUser: { findFirst: jest.Mock; findMany: jest.Mock };
    team: { findMany: jest.Mock };
    project: { findMany: jest.Mock };
    rankingHistory: { findFirst: jest.Mock };
  };
  let sync: { queueIncremental: jest.Mock };
  let users: { suspendInactive: jest.Mock };
  let goals: { sweepAtRisk: jest.Mock };
  let reports: { requestExport: jest.Mock };
  let notifications: { notify: jest.Mock; notifyMany: jest.Mock };
  let config: { get: jest.Mock };
  let rankingQueue: { add: jest.Mock };
  let service: SchedulerService;

  beforeEach(() => {
    prisma = {
      repository: { findMany: jest.fn() },
      organization: { findMany: jest.fn() },
      organizationUser: { findFirst: jest.fn(), findMany: jest.fn() },
      team: { findMany: jest.fn() },
      project: { findMany: jest.fn() },
      rankingHistory: { findFirst: jest.fn() },
    };
    sync = { queueIncremental: jest.fn() };
    users = { suspendInactive: jest.fn() };
    goals = { sweepAtRisk: jest.fn() };
    reports = { requestExport: jest.fn() };
    notifications = { notify: jest.fn(), notifyMany: jest.fn() };
    config = { get: jest.fn().mockReturnValue(5) };
    rankingQueue = { add: jest.fn().mockResolvedValue({}) };

    service = new SchedulerService(
      prisma as unknown as PrismaService,
      sync as unknown as SyncService,
      users as unknown as UsersService,
      goals as unknown as GoalsService,
      reports as unknown as ReportsService,
      notifications as unknown as NotificationsService,
      config as unknown as ConfigService,
      rankingQueue as unknown as Queue,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
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

  describe('triggerPeriodClose (WOR-12)', () => {
    // 2026-09-27 is a Sunday: WEEKLY closes, MONTHLY/QUARTERLY/YEARLY don't.
    // DAILY always closes.
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-09-27T12:00:00.000Z'));
      prisma.organization.findMany.mockResolvedValue([{ id: 'org-1' }]);
    });

    it('closes DAILY and WEEKLY but not MONTHLY/QUARTERLY/YEARLY on a Sunday', async () => {
      prisma.organizationUser.findFirst.mockResolvedValue(null);

      await service.triggerPeriodClose();

      expect(rankingQueue.add).toHaveBeenCalledTimes(2);
      expect(rankingQueue.add).toHaveBeenCalledWith(
        'recompute',
        expect.objectContaining({ organizationId: 'org-1', period: 'DAILY' }),
        { jobId: 'ranking-calc-org-1-DAILY-2026-09-27' },
      );
      expect(rankingQueue.add).toHaveBeenCalledWith(
        'recompute',
        expect.objectContaining({ organizationId: 'org-1', period: 'WEEKLY' }),
        { jobId: 'ranking-calc-org-1-WEEKLY-2026-09-27' },
      );
    });

    it('fans out team/individual AI-analysis exports and digests exactly once, from the digest-eligible period', async () => {
      prisma.organizationUser.findFirst.mockResolvedValue({
        userId: 'admin-1',
      });
      prisma.team.findMany.mockResolvedValue([
        { id: 'team-1', name: 'Frontend', members: [{ userId: 'lead-1' }] },
      ]);
      prisma.organizationUser.findMany.mockResolvedValue([{ userId: 'dev-1' }]);
      prisma.project.findMany.mockResolvedValue([]);

      await service.triggerPeriodClose();

      expect(reports.requestExport).toHaveBeenCalledTimes(2);
      expect(reports.requestExport).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({
          reportType: 'TEAM_AI_ANALYSIS',
          teamId: 'team-1',
        }),
        { userId: 'admin-1', roleKey: 'ORGANIZATION_ADMIN' },
      );
      expect(reports.requestExport).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({
          reportType: 'INDIVIDUAL_AI_ANALYSIS',
          targetUserId: 'dev-1',
        }),
        { userId: 'dev-1', roleKey: 'DEVELOPER' },
      );
      expect(notifications.notifyMany).toHaveBeenCalledWith([
        expect.objectContaining({
          userId: 'lead-1',
          event: 'team_leaderboard_digest',
        }),
      ]);
      expect(notifications.notifyMany).toHaveBeenCalledWith([
        expect.objectContaining({
          userId: 'dev-1',
          event: 'weekly_developer_summary',
        }),
      ]);
    });

    it('skips reports/digests but still closes the ranking period when no active admin exists', async () => {
      prisma.organizationUser.findFirst.mockResolvedValue(null);

      await service.triggerPeriodClose();

      expect(reports.requestExport).not.toHaveBeenCalled();
      expect(notifications.notifyMany).not.toHaveBeenCalled();
      expect(rankingQueue.add).toHaveBeenCalledTimes(2);
    });

    it('sends a project-completion digest only when a project completed within the period', async () => {
      prisma.organizationUser.findFirst.mockResolvedValue({
        userId: 'admin-1',
      });
      prisma.team.findMany.mockResolvedValue([]);
      prisma.organizationUser.findMany.mockResolvedValue([]);
      prisma.project.findMany.mockResolvedValue([{ name: 'Portal Revamp' }]);

      await service.triggerPeriodClose();

      expect(notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          event: 'project_completion_summary',
          body: expect.stringContaining('Portal Revamp'),
        }),
      );
    });
  });

  describe('onApplicationBootstrap catch-up (WOR-12)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-09-27T12:00:00.000Z'));
      prisma.organization.findMany.mockResolvedValue([{ id: 'org-1' }]);
      prisma.organizationUser.findFirst.mockResolvedValue(null);
    });

    it('does nothing for a period with no ranking-history baseline yet', async () => {
      prisma.rankingHistory.findFirst.mockResolvedValue(null);

      await service.onApplicationBootstrap();

      expect(rankingQueue.add).not.toHaveBeenCalled();
    });

    it('backfills missed DAILY periods using their historical reference date, without triggering reports', async () => {
      prisma.rankingHistory.findFirst.mockImplementation(
        ({ where }: { where: { period: string } }) =>
          Promise.resolve(
            where.period === 'DAILY'
              ? { periodEnd: new Date('2026-09-24T00:00:00.000Z') }
              : { periodEnd: new Date('2026-09-27T00:00:00.000Z') },
          ),
      );

      await service.onApplicationBootstrap();

      const dailyCalls = rankingQueue.add.mock.calls.filter(
        ([, data]: [string, { period: string }]) => data.period === 'DAILY',
      );
      expect(dailyCalls).toHaveLength(2);
      expect(
        dailyCalls.map(
          ([, data]: [string, { reference: string }]) => data.reference,
        ),
      ).toEqual(['2026-09-25T00:00:00.000Z', '2026-09-26T00:00:00.000Z']);
      expect(reports.requestExport).not.toHaveBeenCalled();
    });
  });
});

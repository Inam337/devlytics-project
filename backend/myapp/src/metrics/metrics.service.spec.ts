import { AppException } from '../common/exceptions/app.exception';
import type { PrismaService } from '../database/prisma.service';
import type { MetricsQueryDto } from './dto/metrics-query.dto';
import { MetricsService } from './metrics.service';
import type { MetricsAggregationService } from './metrics-aggregation.service';

describe('MetricsService', () => {
  let prisma: {
    organizationUser: { findMany: jest.Mock; findUnique: jest.Mock };
    team: { findMany: jest.Mock; findFirst: jest.Mock };
    repository: { findFirst: jest.Mock };
    commit: { count: jest.Mock };
    pullRequest: { count: jest.Mock };
    pullRequestReview: { count: jest.Mock };
    issue: { count: jest.Mock };
    ciPipeline: { groupBy: jest.Mock };
    developerDailyMetric: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let aggregation: {
    developerTotalsBulk: jest.Mock;
    developerTotals: jest.Mock;
    teamTotals: jest.Mock;
  };
  let service: MetricsService;

  const baseQuery: MetricsQueryDto = {
    page: 1,
    limit: 20,
    skip: 0,
    sortOrder: 'desc',
    from: '2026-01-01',
    to: '2026-01-31',
  } as unknown as MetricsQueryDto;

  beforeEach(() => {
    prisma = {
      organizationUser: { findMany: jest.fn(), findUnique: jest.fn() },
      team: { findMany: jest.fn(), findFirst: jest.fn() },
      repository: { findFirst: jest.fn() },
      commit: { count: jest.fn() },
      pullRequest: { count: jest.fn() },
      pullRequestReview: { count: jest.fn() },
      issue: { count: jest.fn() },
      ciPipeline: { groupBy: jest.fn() },
      developerDailyMetric: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    aggregation = {
      developerTotalsBulk: jest.fn().mockResolvedValue(new Map()),
      developerTotals: jest.fn(),
      teamTotals: jest.fn(),
    };
    service = new MetricsService(
      prisma as unknown as PrismaService,
      aggregation as unknown as MetricsAggregationService,
    );
  });

  describe('developers', () => {
    it('scopes membership lookup to the organization and filters by team when given', async () => {
      prisma.organizationUser.findMany.mockResolvedValue([
        { user: { id: 'user-1', firstName: 'Ada' } },
      ]);
      aggregation.developerTotalsBulk.mockResolvedValue(
        new Map([['user-1', { commits: 10 }]]),
      );

      const result = await service.developers('org-1', {
        ...baseQuery,
        teamId: 'team-1',
      } as unknown as MetricsQueryDto);

      expect(prisma.organizationUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
            status: 'ACTIVE',
            user: { teamMemberships: { some: { teamId: 'team-1' } } },
          }),
        }),
      );
      expect(result[0].metrics).toEqual({ commits: 10 });
    });

    it('backfills empty totals for a developer with no aggregated metrics', async () => {
      prisma.organizationUser.findMany.mockResolvedValue([
        { user: { id: 'user-1', firstName: 'Ada' } },
      ]);
      aggregation.developerTotalsBulk.mockResolvedValue(new Map());

      const result = await service.developers('org-1', baseQuery);

      expect(result[0].metrics).toEqual(
        expect.objectContaining({ commits: 0, activeDays: 0 }),
      );
    });
  });

  describe('developerOne', () => {
    it('throws not-found for a user outside the organization', async () => {
      prisma.organizationUser.findUnique.mockResolvedValue(null);

      await expect(
        service.developerOne('org-1', 'user-from-other-org', baseQuery),
      ).rejects.toThrow(AppException);
    });

    it('returns the developer totals plus a gap-filled daily trend', async () => {
      prisma.organizationUser.findUnique.mockResolvedValue({
        user: { id: 'user-1', firstName: 'Ada' },
      });
      aggregation.developerTotals.mockResolvedValue({ commits: 5 });
      prisma.developerDailyMetric.findMany.mockResolvedValue([
        {
          metricDate: new Date('2026-01-01'),
          commits: 3,
          prsMerged: 1,
          reviewsGiven: 2,
          locAdded: 10,
          locRemoved: 4,
        },
      ]);

      const result = await service.developerOne('org-1', 'user-1', {
        ...baseQuery,
        from: '2026-01-01',
        to: '2026-01-02',
      } as unknown as MetricsQueryDto);

      expect(result.metrics).toEqual({ commits: 5 });
      expect(result.trend).toEqual([
        {
          date: '2026-01-01',
          commits: 3,
          prsMerged: 1,
          reviewsGiven: 2,
          linesOfCode: 14,
        },
        {
          date: '2026-01-02',
          commits: 0,
          prsMerged: 0,
          reviewsGiven: 0,
          linesOfCode: 0,
        },
      ]);
    });
  });

  describe('teamOne', () => {
    it('throws not-found for a team outside the organization', async () => {
      prisma.team.findFirst.mockResolvedValue(null);

      await expect(
        service.teamOne('org-1', 'team-from-other-org', baseQuery),
      ).rejects.toThrow(AppException);
    });

    it('returns the team totals for an in-tenant team', async () => {
      prisma.team.findFirst.mockResolvedValue({
        id: 'team-1',
        name: 'Platform',
      });
      aggregation.teamTotals.mockResolvedValue({ commits: 42 });

      const result = await service.teamOne('org-1', 'team-1', baseQuery);

      expect(aggregation.teamTotals).toHaveBeenCalledWith(
        'org-1',
        'team-1',
        expect.any(Date),
        expect.any(Date),
      );
      expect(result.metrics).toEqual({ commits: 42 });
    });
  });

  describe('repositoryOne', () => {
    it('throws not-found for a repository outside the organization', async () => {
      prisma.repository.findFirst.mockResolvedValue(null);

      await expect(
        service.repositoryOne('org-1', 'repo-from-other-org', baseQuery),
      ).rejects.toThrow(AppException);
    });

    it('computes CI success rate only from finished (SUCCESS/FAILED) pipelines', async () => {
      prisma.repository.findFirst.mockResolvedValue({
        id: 'repo-1',
        name: 'repo-1',
        fullName: 'org/repo-1',
      });
      prisma.commit.count.mockResolvedValue(10);
      prisma.pullRequest.count.mockResolvedValue(4);
      prisma.pullRequestReview.count.mockResolvedValue(6);
      prisma.issue.count.mockResolvedValue(2);
      prisma.ciPipeline.groupBy.mockResolvedValue([
        { status: 'SUCCESS', _count: 8 },
        { status: 'FAILED', _count: 2 },
        { status: 'RUNNING', _count: 3 }, // must be excluded from the denominator
      ]);

      const result = await service.repositoryOne('org-1', 'repo-1', baseQuery);

      expect(result.metrics).toEqual({
        commits: 10,
        pullRequests: 4,
        reviews: 6,
        issues: 2,
        ciSuccessRate: 80, // 8 / (8+2)
      });
    });

    it('reports a null CI success rate when no pipeline has finished yet', async () => {
      prisma.repository.findFirst.mockResolvedValue({
        id: 'repo-1',
        name: 'repo-1',
        fullName: 'org/repo-1',
      });
      prisma.commit.count.mockResolvedValue(0);
      prisma.pullRequest.count.mockResolvedValue(0);
      prisma.pullRequestReview.count.mockResolvedValue(0);
      prisma.issue.count.mockResolvedValue(0);
      prisma.ciPipeline.groupBy.mockResolvedValue([
        { status: 'RUNNING', _count: 3 },
      ]);

      const result = await service.repositoryOne('org-1', 'repo-1', baseQuery);

      expect(result.metrics.ciSuccessRate).toBeNull();
    });
  });
});

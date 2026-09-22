import { Prisma } from '@prisma/client';
import { PeriodUtil } from '../common/utils/period.util';
import type { NotificationsService } from '../notifications/notifications.service';
import type { PrismaService } from '../database/prisma.service';
import { RankingsQueryDto } from './dto/rankings-query.dto';
import { RankingsService } from './rankings.service';

describe('RankingsService', () => {
  let prisma: {
    developerScore: { findMany: jest.Mock };
    teamScore: { findMany: jest.Mock };
    rankingHistory: {
      findMany: jest.Mock;
      upsert: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let notifications: { notifyMany: jest.Mock };
  let service: RankingsService;

  beforeEach(() => {
    prisma = {
      developerScore: { findMany: jest.fn() },
      teamScore: { findMany: jest.fn() },
      rankingHistory: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    notifications = { notifyMany: jest.fn().mockResolvedValue(undefined) };
    service = new RankingsService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
    prisma.rankingHistory.upsert.mockResolvedValue({});
  });

  describe('closePeriod / closeSubject', () => {
    it('returns zero for both subjects and writes nothing when no scores exist for the period', async () => {
      prisma.developerScore.findMany.mockResolvedValue([]);
      prisma.teamScore.findMany.mockResolvedValue([]);

      const result = await service.closePeriod(
        'org-1',
        'MONTHLY',
        new Date('2026-02-15'),
      );

      expect(result).toEqual({ developers: 0, teams: 0 });
      expect(prisma.rankingHistory.findMany).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(notifications.notifyMany).not.toHaveBeenCalled();
    });

    it('ranks developers by total score descending and derives rank delta from the previous period', async () => {
      prisma.developerScore.findMany.mockResolvedValue([
        { userId: 'u1', totalScore: new Prisma.Decimal(90), weightVersion: 1 },
        { userId: 'u2', totalScore: new Prisma.Decimal(80), weightVersion: 1 },
        { userId: 'u3', totalScore: new Prisma.Decimal(70), weightVersion: 1 },
      ]);
      prisma.teamScore.findMany.mockResolvedValue([]);
      prisma.rankingHistory.findMany.mockResolvedValue([
        { userId: 'u2', rank: 1 },
        { userId: 'u3', rank: 2 },
      ]);

      const result = await service.closePeriod(
        'org-1',
        'MONTHLY',
        new Date('2026-02-15'),
      );

      expect(result.developers).toBe(3);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const upsertCalls = prisma.rankingHistory.upsert.mock.calls.map(
        (call) => call[0],
      );

      const u1 = upsertCalls.find(
        (c) => c.where.ranking_subject_period_unique.subjectId === 'u1',
      );
      expect(u1.create).toMatchObject({
        rank: 1,
        previousRank: null,
        rankDelta: 0,
        totalSubjects: 3,
      });
      expect((u1.create.score as Prisma.Decimal).toNumber()).toBe(90);

      const u2 = upsertCalls.find(
        (c) => c.where.ranking_subject_period_unique.subjectId === 'u2',
      );
      expect(u2.create).toMatchObject({
        rank: 2,
        previousRank: 1,
        rankDelta: -1,
        totalSubjects: 3,
      });

      const u3 = upsertCalls.find(
        (c) => c.where.ranking_subject_period_unique.subjectId === 'u3',
      );
      expect(u3.create).toMatchObject({
        rank: 3,
        previousRank: 2,
        rankDelta: -1,
        totalSubjects: 3,
      });
    });

    it('scopes the previous-period lookup and the upsert key to the same organization, subject type and weight version', async () => {
      prisma.developerScore.findMany.mockResolvedValue([
        { userId: 'u1', totalScore: new Prisma.Decimal(50), weightVersion: 4 },
      ]);
      prisma.teamScore.findMany.mockResolvedValue([]);
      prisma.rankingHistory.findMany.mockResolvedValue([]);

      await service.closePeriod('org-1', 'MONTHLY', new Date('2026-02-15'));

      const range = PeriodUtil.resolve('MONTHLY', new Date('2026-02-15'));
      const previousRange = PeriodUtil.previous(
        'MONTHLY',
        new Date('2026-02-15'),
      );

      expect(prisma.rankingHistory.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          subjectType: 'DEVELOPER',
          period: 'MONTHLY',
          periodStart: previousRange.start,
        },
      });
      expect(prisma.rankingHistory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            ranking_subject_period_unique: {
              organizationId: 'org-1',
              subjectType: 'DEVELOPER',
              subjectId: 'u1',
              period: 'MONTHLY',
              periodStart: range.start,
              weightVersion: 4,
            },
          },
        }),
      );
    });

    it('only sends rank-change notifications for developers, never for teams', async () => {
      prisma.developerScore.findMany.mockResolvedValue([]);
      prisma.teamScore.findMany.mockResolvedValue([
        { teamId: 't1', totalScore: new Prisma.Decimal(60), weightVersion: 1 },
      ]);
      prisma.rankingHistory.findMany.mockResolvedValue([]);

      await service.closePeriod('org-1', 'MONTHLY', new Date('2026-02-15'));

      expect(notifications.notifyMany).not.toHaveBeenCalled();
    });

    it('notifies only moves of two or more places, wording climbs and drops differently', async () => {
      prisma.developerScore.findMany.mockResolvedValue([
        { userId: 'up', totalScore: new Prisma.Decimal(95), weightVersion: 1 }, // rank 1, was 4 -> +3
        {
          userId: 'flat',
          totalScore: new Prisma.Decimal(80),
          weightVersion: 1,
        }, // rank 2, was 1 -> -1 (below threshold)
        {
          userId: 'down',
          totalScore: new Prisma.Decimal(60),
          weightVersion: 1,
        }, // rank 3, was 1 -> -2
      ]);
      prisma.teamScore.findMany.mockResolvedValue([]);
      prisma.rankingHistory.findMany.mockResolvedValue([
        { userId: 'up', rank: 4 },
        { userId: 'flat', rank: 1 },
        { userId: 'down', rank: 1 },
      ]);

      await service.closePeriod('org-1', 'MONTHLY', new Date('2026-02-15'));

      expect(notifications.notifyMany).toHaveBeenCalledWith([
        expect.objectContaining({
          userId: 'up',
          title: expect.stringContaining('moved up to #1'),
        }),
        expect.objectContaining({
          userId: 'down',
          title: expect.stringContaining('moved to #3'),
        }),
      ]);
    });
  });

  describe('leaderboard reads', () => {
    function query(
      overrides: Partial<RankingsQueryDto> = {},
    ): RankingsQueryDto {
      return Object.assign(new RankingsQueryDto(), overrides);
    }

    it('defaults to the monthly period for today when no period or date is given', async () => {
      prisma.rankingHistory.findMany.mockResolvedValue([]);
      prisma.developerScore.findMany.mockResolvedValue([]);

      await service.developerLeaderboard('org-1', query());

      const range = PeriodUtil.resolve('MONTHLY', new Date());
      const call = prisma.rankingHistory.findMany.mock.calls[0][0];
      expect(call.where.period).toBe('MONTHLY');
      expect(call.where.periodStart).toEqual(range.start);
    });

    it('filters a developer leaderboard by team membership but never applies that filter to a team leaderboard', async () => {
      prisma.rankingHistory.findMany.mockResolvedValue([]);
      prisma.developerScore.findMany.mockResolvedValue([]);
      prisma.teamScore.findMany.mockResolvedValue([]);

      await service.developerLeaderboard('org-1', query({ teamId: 'team-1' }));
      const developerWhere =
        prisma.rankingHistory.findMany.mock.calls[0][0].where;
      expect(developerWhere.user).toEqual({
        teamMemberships: { some: { teamId: 'team-1' } },
      });

      await service.teamLeaderboard('org-1', query({ teamId: 'team-1' }));
      const teamWhere = prisma.rankingHistory.findMany.mock.calls[1][0].where;
      expect(teamWhere.user).toBeUndefined();
    });

    // Note: departmentId filtering is applied via `{ team: { departmentId } } }`
    // unconditionally (rankings.service.ts leaderboard()). For DEVELOPER rows,
    // tbl_ranking_history.team_id is always null (see closeSubject), so this
    // filter can only ever match TEAM leaderboard rows in the current
    // implementation — worth a product/eng follow-up, not asserted here as
    // correct behaviour.
    it('filters a team leaderboard by department', async () => {
      prisma.rankingHistory.findMany.mockResolvedValue([]);
      prisma.teamScore.findMany.mockResolvedValue([]);

      await service.teamLeaderboard('org-1', query({ departmentId: 'dept-1' }));

      expect(
        prisma.rankingHistory.findMany.mock.calls[0][0].where.team,
      ).toEqual({
        departmentId: 'dept-1',
      });
    });

    it('attaches a score breakdown only for entries with a matching score row', async () => {
      prisma.rankingHistory.findMany.mockResolvedValue([
        {
          rank: 1,
          previousRank: null,
          rankDelta: 0,
          score: new Prisma.Decimal(90),
          userId: 'u1',
          user: { id: 'u1' },
        },
        {
          rank: 2,
          previousRank: null,
          rankDelta: 0,
          score: new Prisma.Decimal(70),
          userId: 'u2',
          user: { id: 'u2' },
        },
      ]);
      prisma.developerScore.findMany.mockResolvedValue([
        {
          userId: 'u1',
          codeQualityScore: new Prisma.Decimal(80),
          deliveryScore: new Prisma.Decimal(70),
          codeReviewScore: new Prisma.Decimal(60),
          testingScore: new Prisma.Decimal(50),
        },
      ]);

      const result = await service.developerLeaderboard('org-1', query());

      expect(result.entries[0].breakdown).toEqual({
        codeQuality: 80,
        delivery: 70,
        codeReview: 60,
        testing: 50,
      });
      expect(result.entries[1].breakdown).toBeNull();
    });

    it('formats period boundaries as date-only strings', async () => {
      prisma.rankingHistory.findMany.mockResolvedValue([]);
      prisma.developerScore.findMany.mockResolvedValue([]);

      const result = await service.developerLeaderboard(
        'org-1',
        query({ date: '2026-03-10' }),
      );

      const range = PeriodUtil.resolve('MONTHLY', new Date('2026-03-10'));
      expect(result.periodStart).toBe(PeriodUtil.toDateOnly(range.start));
      expect(result.periodEnd).toBe(PeriodUtil.toDateOnly(range.end));
    });
  });

  describe('history', () => {
    function query(
      overrides: Partial<RankingsQueryDto> = {},
    ): RankingsQueryDto {
      return Object.assign(new RankingsQueryDto(), overrides);
    }

    it('builds the where clause only from filters that were actually provided', async () => {
      prisma.rankingHistory.findMany.mockResolvedValue([]);
      prisma.rankingHistory.count.mockResolvedValue(0);

      await service.history('org-1', query());

      expect(prisma.rankingHistory.findMany.mock.calls[0][0].where).toEqual({
        organizationId: 'org-1',
      });
    });

    it('includes every provided filter in the where clause', async () => {
      prisma.rankingHistory.findMany.mockResolvedValue([]);
      prisma.rankingHistory.count.mockResolvedValue(0);

      await service.history(
        'org-1',
        query({
          subjectType: 'TEAM',
          period: 'WEEKLY',
          userId: 'user-1',
          teamId: 'team-1',
        }),
      );

      expect(prisma.rankingHistory.findMany.mock.calls[0][0].where).toEqual({
        organizationId: 'org-1',
        subjectType: 'TEAM',
        period: 'WEEKLY',
        userId: 'user-1',
        teamId: 'team-1',
      });
    });

    it('returns items and total from one paginated read', async () => {
      const items = [{ id: 'r1' }, { id: 'r2' }];
      prisma.rankingHistory.findMany.mockResolvedValue(items);
      prisma.rankingHistory.count.mockResolvedValue(2);

      const result = await service.history('org-1', query());

      expect(result).toEqual({ items, total: 2 });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});

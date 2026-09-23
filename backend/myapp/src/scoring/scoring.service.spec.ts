import type { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AppException } from '../common/exceptions/app.exception';
import type { AuditService } from '../audit/audit.service';
import type { MailService } from '../common/services/mail.service';
import type {
  MetricsAggregationService,
  MetricTotals,
} from '../metrics/metrics-aggregation.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { PrismaService } from '../database/prisma.service';
import { DEFAULT_SCORING_WEIGHTS, SCORE_CATEGORIES } from './scoring.constants';
import { ScoringService } from './scoring.service';

function decimalRows(weights: Record<string, number>) {
  return Object.entries(weights).map(([category, weightPercent]) => ({
    category,
    weightPercent: new Prisma.Decimal(weightPercent),
  }));
}

function baseTotals(overrides: Partial<MetricTotals> = {}): MetricTotals {
  return {
    commits: 0,
    prsCreated: 0,
    prsMerged: 0,
    prsReviewed: 0,
    reviewsGiven: 0,
    issuesCreated: 0,
    issuesResolved: 0,
    locAdded: 0,
    locRemoved: 0,
    filesChanged: 0,
    testsAdded: 0,
    testsChanged: 0,
    docsChanged: 0,
    builds: 0,
    successfulBuilds: 0,
    failedBuilds: 0,
    activeDays: 0,
    ...overrides,
  };
}

describe('ScoringService', () => {
  let prisma: {
    organization: { findUniqueOrThrow: jest.Mock; update: jest.Mock };
    scoringRule: {
      findMany: jest.Mock;
      updateMany: jest.Mock;
      createMany: jest.Mock;
    };
    developerScore: { upsert: jest.Mock };
    teamScore: { upsert: jest.Mock };
    teamMember: { findMany: jest.Mock };
    organizationUser: { findMany: jest.Mock };
    team: { findMany: jest.Mock };
    repositoryMember: { findMany: jest.Mock };
    codeQualitySnapshot: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let metrics: { developerTotals: jest.Mock };
  let audit: { record: jest.Mock };
  let notifications: { notifyMany: jest.Mock };
  let mail: { sendTemplate: jest.Mock };
  let service: ScoringService;

  beforeEach(() => {
    prisma = {
      organization: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
      scoringRule: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
        createMany: jest.fn(),
      },
      developerScore: { upsert: jest.fn() },
      teamScore: { upsert: jest.fn() },
      teamMember: { findMany: jest.fn() },
      organizationUser: { findMany: jest.fn() },
      team: { findMany: jest.fn() },
      repositoryMember: { findMany: jest.fn() },
      codeQualitySnapshot: { findMany: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    metrics = { developerTotals: jest.fn() };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    notifications = { notifyMany: jest.fn().mockResolvedValue(undefined) };
    mail = { sendTemplate: jest.fn().mockResolvedValue({ success: true }) };

    service = new ScoringService(
      prisma as unknown as PrismaService,
      metrics as unknown as MetricsAggregationService,
      audit as unknown as AuditService,
      notifications as unknown as NotificationsService,
      mail as unknown as MailService,
      {
        get: jest.fn().mockReturnValue('http://localhost:3000'),
      } as unknown as ConfigService,
    );
  });

  describe('findWeights', () => {
    it('returns the active weight version, its total and each category weight as a plain number', async () => {
      prisma.organization.findUniqueOrThrow.mockResolvedValue({
        activeWeightVersion: 3,
      });
      prisma.scoringRule.findMany.mockResolvedValue(
        decimalRows({
          CODE_QUALITY: 30,
          DELIVERY: 20,
          CODE_REVIEW: 15,
          TESTING: 15,
          RELIABILITY: 10,
          COLLABORATION: 5,
          DOCUMENTATION: 3,
          PROJECT_IMPACT: 2,
        }),
      );

      const result = await service.findWeights('org-1');

      expect(prisma.scoringRule.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', weightVersion: 3 },
        orderBy: { category: 'asc' },
      });
      expect(result.weightVersion).toBe(3);
      expect(result.total).toBe(100);
      expect(result.categories).toContainEqual({
        category: 'CODE_QUALITY',
        weightPercent: 30,
      });
      expect(
        result.categories.every((c) => typeof c.weightPercent === 'number'),
      ).toBe(true);
    });
  });

  describe('setWeights', () => {
    const actor = { actorId: 'user-1' };

    function validCategories(
      overrideWeights: Partial<Record<string, number>> = {},
    ) {
      return SCORE_CATEGORIES.map((category) => ({
        category,
        weightPercent:
          overrideWeights[category] ?? DEFAULT_SCORING_WEIGHTS[category],
      }));
    }

    it('rejects a total that is not 100% within tolerance', async () => {
      const categories = validCategories({
        CODE_QUALITY: DEFAULT_SCORING_WEIGHTS.CODE_QUALITY - 5,
      });

      await expect(
        service.setWeights('org-1', { categories, reason: 'test' }, actor),
      ).rejects.toMatchObject({ code: 'SCORING_WEIGHTS_INVALID' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('accepts a total within the rounding tolerance of 100%', async () => {
      // 33.33 + 33.33 + 33.34 style rounding across 8 categories: nudge one
      // category by the epsilon and confirm it is treated as exactly 100%.
      const categories = validCategories({
        CODE_QUALITY: DEFAULT_SCORING_WEIGHTS.CODE_QUALITY + 0.005,
      });
      prisma.organization.findUniqueOrThrow.mockResolvedValue({
        activeWeightVersion: 1,
      });
      prisma.scoringRule.findMany.mockResolvedValue(
        decimalRows(DEFAULT_SCORING_WEIGHTS),
      );
      prisma.organizationUser.findMany.mockResolvedValue([]);

      await expect(
        service.setWeights('org-1', { categories, reason: 'rounding' }, actor),
      ).resolves.toBeDefined();
    });

    it('rejects a payload that omits or duplicates a category even if the total is 100%', async () => {
      const categories = validCategories();
      // Relabel the last entry as a duplicate of the first category, keeping its
      // original weight so the total is still exactly 100 — isolating the
      // category-coverage check from the total check.
      categories[categories.length - 1] = {
        category: categories[0].category,
        weightPercent: categories[categories.length - 1].weightPercent,
      };

      await expect(
        service.setWeights('org-1', { categories, reason: 'test' }, actor),
      ).rejects.toThrow(AppException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('persists the next weight version, audits the change and notifies admins', async () => {
      const categories = validCategories();
      prisma.organization.findUniqueOrThrow
        .mockResolvedValueOnce({ activeWeightVersion: 1 }) // read before recompute
        .mockResolvedValueOnce({ activeWeightVersion: 1 }) // inside `previous = findWeights()`
        .mockResolvedValueOnce({ activeWeightVersion: 2 }); // inside the final findWeights() after commit
      prisma.scoringRule.findMany
        .mockResolvedValueOnce(decimalRows(DEFAULT_SCORING_WEIGHTS)) // previous
        .mockResolvedValueOnce(decimalRows(DEFAULT_SCORING_WEIGHTS)); // after commit
      prisma.organizationUser.findMany.mockResolvedValue([
        {
          userId: 'admin-1',
          user: { email: 'admin-1@example.com', firstName: 'Ada' },
        },
        {
          userId: 'admin-2',
          user: { email: 'admin-2@example.com', firstName: 'Bo' },
        },
      ]);

      const result = await service.setWeights(
        'org-1',
        { categories, reason: 'quarterly review' },
        actor,
      );

      expect(prisma.scoringRule.updateMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', isActive: true },
        data: { isActive: false },
      });
      expect(prisma.scoringRule.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            organizationId: 'org-1',
            weightVersion: 2,
            isActive: true,
            reason: 'quarterly review',
            createdById: 'user-1',
          }),
        ]),
      });
      expect(prisma.scoringRule.createMany.mock.calls[0][0].data).toHaveLength(
        8,
      );
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { activeWeightVersion: 2 },
      });

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          actorId: 'user-1',
          category: 'SCORING',
          action: 'scoring.weights_changed',
          after: expect.objectContaining({ weightVersion: 2 }),
        }),
      );

      expect(prisma.organizationUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: 'org-1',
            role: { key: 'ORGANIZATION_ADMIN' },
            status: 'ACTIVE',
          },
        }),
      );
      expect(notifications.notifyMany).toHaveBeenCalledWith([
        expect.objectContaining({ userId: 'admin-1' }),
        expect.objectContaining({ userId: 'admin-2' }),
      ]);

      // Before/after weights and the reason are the AC this email exists for.
      expect(mail.sendTemplate).toHaveBeenCalledTimes(2);
      expect(mail.sendTemplate).toHaveBeenCalledWith(
        'admin-1@example.com',
        expect.objectContaining({
          subject: expect.stringContaining('version 2'),
        }),
      );

      expect(result.weightVersion).toBe(2);
    });
  });

  describe('computeDeveloperScore', () => {
    const period = {
      period: 'MONTHLY' as const,
      start: new Date('2026-01-01'),
      end: new Date('2026-01-31'),
    };

    function mockWeights(
      weights: Record<string, number> = DEFAULT_SCORING_WEIGHTS,
    ) {
      prisma.organization.findUniqueOrThrow.mockResolvedValue({
        activeWeightVersion: 1,
      });
      prisma.scoringRule.findMany.mockResolvedValue(decimalRows(weights));
    }

    it('derives every category score from measured totals and quality, then upserts the weighted total', async () => {
      mockWeights();
      metrics.developerTotals.mockResolvedValue(
        baseTotals({
          commits: 40,
          prsMerged: 12,
          prsCreated: 0,
          reviewsGiven: 20,
          prsReviewed: 0,
          testsAdded: 15,
          docsChanged: 8,
          issuesResolved: 10,
          builds: 0,
        }),
      );
      prisma.repositoryMember.findMany.mockResolvedValue([
        { repositoryId: 'repo-1' },
      ]);
      prisma.codeQualitySnapshot.findMany.mockResolvedValue([
        {
          repositoryId: 'repo-1',
          qualityScore: new Prisma.Decimal(80),
          snapshotDate: new Date('2026-01-30'),
        },
      ]);
      prisma.developerScore.upsert.mockResolvedValue({ id: 'score-1' });

      await service.computeDeveloperScore('org-1', 'user-1', period);

      const call = prisma.developerScore.upsert.mock.calls[0][0];
      expect(call.where).toEqual({
        userId_period_periodStart_weightVersion: {
          userId: 'user-1',
          period: 'MONTHLY',
          periodStart: period.start,
          weightVersion: 1,
        },
      });
      expect((call.create.codeQualityScore as Prisma.Decimal).toNumber()).toBe(
        80,
      );
      expect((call.create.deliveryScore as Prisma.Decimal).toNumber()).toBe(
        100,
      );
      expect((call.create.testingScore as Prisma.Decimal).toNumber()).toBe(100);
      expect(
        (call.create.collaborationScore as Prisma.Decimal).toNumber(),
      ).toBe(80);
      // weighted total = 80*.25 + 100*.20 + 100*.15 + 100*.15 + 100*.10 + 80*.05 + 100*.05 + 100*.05 = 94
      expect((call.create.totalScore as Prisma.Decimal).toNumber()).toBe(94);
      expect(call.create.freshness).toBe('LIVE');
    });

    it('scores code quality as 0 when the developer has no repositories with a quality snapshot', async () => {
      mockWeights();
      metrics.developerTotals.mockResolvedValue(baseTotals());
      prisma.repositoryMember.findMany.mockResolvedValue([]);
      prisma.developerScore.upsert.mockResolvedValue({ id: 'score-1' });

      await service.computeDeveloperScore('org-1', 'user-1', period);

      const call = prisma.developerScore.upsert.mock.calls[0][0];
      expect((call.create.codeQualityScore as Prisma.Decimal).toNumber()).toBe(
        0,
      );
      expect(prisma.codeQualitySnapshot.findMany).not.toHaveBeenCalled();
    });

    it('uses reviewsGiven against the fixed reference when no PRs were created, and PR-relative review depth otherwise', async () => {
      mockWeights();
      prisma.repositoryMember.findMany.mockResolvedValue([]);
      prisma.developerScore.upsert.mockResolvedValue({ id: 'score-1' });

      // Branch 1: no PRs created — falls back to reviewsGiven / REVIEWS_GIVEN (20).
      metrics.developerTotals.mockResolvedValue(
        baseTotals({ prsCreated: 0, reviewsGiven: 10 }),
      );
      await service.computeDeveloperScore('org-1', 'user-1', period);
      const first = prisma.developerScore.upsert.mock.calls[0][0];
      // reviewParticipation = normalize(10, 20) = 50; CODE_REVIEW = avg(normalize(10,20)=50, 50) = 50
      expect((first.create.codeReviewScore as Prisma.Decimal).toNumber()).toBe(
        50,
      );

      // Branch 2: PRs created — review participation is PR-relative (prsReviewed / prsCreated*2).
      metrics.developerTotals.mockResolvedValue(
        baseTotals({ prsCreated: 4, prsReviewed: 4, reviewsGiven: 20 }),
      );
      await service.computeDeveloperScore('org-1', 'user-1', period);
      const second = prisma.developerScore.upsert.mock.calls[1][0];
      // reviewParticipation = normalize(4, 8) = 50; CODE_REVIEW = avg(normalize(20,20)=100, 50) = 75
      expect((second.create.codeReviewScore as Prisma.Decimal).toNumber()).toBe(
        75,
      );
    });

    it('treats zero builds as full reliability rather than dividing by zero', async () => {
      mockWeights();
      prisma.repositoryMember.findMany.mockResolvedValue([]);
      prisma.developerScore.upsert.mockResolvedValue({ id: 'score-1' });

      metrics.developerTotals.mockResolvedValue(baseTotals({ builds: 0 }));
      await service.computeDeveloperScore('org-1', 'user-1', period);
      expect(
        (
          prisma.developerScore.upsert.mock.calls[0][0].create
            .reliabilityScore as Prisma.Decimal
        ).toNumber(),
      ).toBe(100);

      metrics.developerTotals.mockResolvedValue(
        baseTotals({ builds: 10, successfulBuilds: 7 }),
      );
      await service.computeDeveloperScore('org-1', 'user-1', period);
      expect(
        (
          prisma.developerScore.upsert.mock.calls[1][0].create
            .reliabilityScore as Prisma.Decimal
        ).toNumber(),
      ).toBe(70);
    });

    it('carries measured freshness through to the persisted row', async () => {
      mockWeights();
      metrics.developerTotals.mockResolvedValue(baseTotals());
      prisma.repositoryMember.findMany.mockResolvedValue([]);
      prisma.developerScore.upsert.mockResolvedValue({ id: 'score-1' });

      await service.computeDeveloperScore('org-1', 'user-1', period, 'STALE');

      expect(
        prisma.developerScore.upsert.mock.calls[0][0].create.freshness,
      ).toBe('STALE');
      expect(
        prisma.developerScore.upsert.mock.calls[0][0].update.freshness,
      ).toBe('STALE');
    });
  });

  describe('computeTeamScore', () => {
    const period = {
      period: 'MONTHLY' as const,
      start: new Date('2026-01-01'),
      end: new Date('2026-01-31'),
    };

    it('upserts a zero-member score without touching per-developer metrics when the team is empty', async () => {
      prisma.organization.findUniqueOrThrow.mockResolvedValue({
        activeWeightVersion: 1,
      });
      prisma.scoringRule.findMany.mockResolvedValue(
        decimalRows(DEFAULT_SCORING_WEIGHTS),
      );
      prisma.teamMember.findMany.mockResolvedValue([]);
      prisma.teamScore.upsert.mockResolvedValue({ id: 'team-score-1' });

      await service.computeTeamScore('org-1', 'team-1', period);

      expect(metrics.developerTotals).not.toHaveBeenCalled();
      expect(prisma.teamScore.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ memberCount: 0 }),
          create: expect.objectContaining({ memberCount: 0 }),
        }),
      );
    });

    it('averages each category across members rather than averaging their leaderboard ranks', async () => {
      prisma.organization.findUniqueOrThrow.mockResolvedValue({
        activeWeightVersion: 1,
      });
      prisma.scoringRule.findMany.mockResolvedValue(
        decimalRows(DEFAULT_SCORING_WEIGHTS),
      );
      prisma.teamMember.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);
      prisma.repositoryMember.findMany.mockResolvedValue([]);
      prisma.teamScore.upsert.mockResolvedValue({ id: 'team-score-1' });

      metrics.developerTotals
        .mockResolvedValueOnce(baseTotals({ commits: 40, prsMerged: 12 })) // member 1: DELIVERY = 100
        .mockResolvedValueOnce(baseTotals()); // member 2: DELIVERY = 0

      await service.computeTeamScore('org-1', 'team-1', period);

      const call = prisma.teamScore.upsert.mock.calls[0][0];
      expect((call.create.deliveryScore as Prisma.Decimal).toNumber()).toBe(50);
      expect(call.create.memberCount).toBe(2);
    });
  });

  describe('recomputeOrganization', () => {
    const period = {
      period: 'MONTHLY' as const,
      start: new Date('2026-01-01'),
      end: new Date('2026-01-31'),
    };

    it('recomputes every active member and active team exactly once', async () => {
      prisma.organizationUser.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);
      prisma.team.findMany.mockResolvedValue([{ id: 'team-1' }]);
      const developerSpy = jest
        .spyOn(service, 'computeDeveloperScore')
        .mockResolvedValue(undefined as never);
      const teamSpy = jest
        .spyOn(service, 'computeTeamScore')
        .mockResolvedValue(undefined as never);

      const result = await service.recomputeOrganization('org-1', period);

      expect(prisma.organizationUser.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', status: 'ACTIVE' },
        select: { userId: true },
      });
      expect(prisma.team.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', status: 'ACTIVE' },
        select: { id: true },
      });
      expect(developerSpy).toHaveBeenCalledTimes(2);
      expect(teamSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ developers: 2, teams: 1 });
    });
  });
});

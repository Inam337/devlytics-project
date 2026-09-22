import { Injectable, Logger } from '@nestjs/common';
import { Prisma, ScoreCategory } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/exceptions/app.exception';
import { NumberUtil } from '../common/utils/number.util';
import { PeriodUtil } from '../common/utils/period.util';
import { PrismaService } from '../database/prisma.service';
import {
  MetricsAggregationService,
  MetricTotals,
} from '../metrics/metrics-aggregation.service';
import { NotificationEvent } from '../notifications/notification-events';
import { NotificationsService } from '../notifications/notifications.service';
import type { ActorContext } from '../organizations/organizations.service';
import {
  REQUIRED_WEIGHT_TOTAL,
  SCORE_CATEGORIES,
  SCORE_REFERENCE,
  WEIGHT_TOTAL_EPSILON,
} from './scoring.constants';
import { SetScoringWeightsDto } from './dto/scoring.dto';

export type CategoryScores = Record<ScoreCategory, number>;

/**
 * The scoring engine (docs/devlytics.md §5, requirements §10).
 *
 * Every category score is derived from measured evidence already stored in
 * `tbl_developer_daily_metric` / `tbl_code_quality_snapshot` — nothing here
 * re-reads raw commits. Lines of code never appears in any weighted category:
 * it is reported elsewhere as activity only.
 */
@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsAggregationService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  // --- weight configuration --------------------------------------------------

  async findWeights(organizationId: string) {
    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { activeWeightVersion: true },
    });

    const rules = await this.prisma.scoringRule.findMany({
      where: {
        organizationId,
        weightVersion: organization.activeWeightVersion,
      },
      orderBy: { category: 'asc' },
    });

    return {
      weightVersion: organization.activeWeightVersion,
      total: NumberUtil.sum(
        rules.map((rule) => NumberUtil.toNumber(rule.weightPercent)),
      ),
      categories: rules.map((rule) => ({
        category: rule.category,
        weightPercent: NumberUtil.toNumber(rule.weightPercent),
      })),
    };
  }

  /**
   * Saves a brand-new weight version. Weights must total exactly 100% — this is
   * a blocking validation error, matching the UI's blocking state. Existing
   * rankings keep referencing their original version; nothing is rewritten.
   */
  async setWeights(
    organizationId: string,
    dto: SetScoringWeightsDto,
    actor: ActorContext,
  ) {
    const total = NumberUtil.sum(
      dto.categories.map((entry) => entry.weightPercent),
    );
    if (Math.abs(total - REQUIRED_WEIGHT_TOTAL) > WEIGHT_TOTAL_EPSILON) {
      throw AppException.unprocessable(
        `Scoring weights must total exactly 100%. Received ${NumberUtil.round(total)}%.`,
        'SCORING_WEIGHTS_INVALID',
      );
    }
    const categories = new Set(dto.categories.map((entry) => entry.category));
    if (categories.size !== SCORE_CATEGORIES.length) {
      throw AppException.badRequest(
        `All ${SCORE_CATEGORIES.length} categories must be provided exactly once.`,
      );
    }

    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { activeWeightVersion: true },
    });
    const previous = await this.findWeights(organizationId);
    const nextVersion = organization.activeWeightVersion + 1;

    await this.prisma.$transaction([
      this.prisma.scoringRule.updateMany({
        where: { organizationId, isActive: true },
        data: { isActive: false },
      }),
      this.prisma.scoringRule.createMany({
        data: dto.categories.map((entry) => ({
          organizationId,
          weightVersion: nextVersion,
          category: entry.category,
          weightPercent: new Prisma.Decimal(entry.weightPercent),
          isActive: true,
          reason: dto.reason,
          createdById: actor.actorId,
        })),
      }),
      this.prisma.organization.update({
        where: { id: organizationId },
        data: { activeWeightVersion: nextVersion },
      }),
    ]);

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'SCORING',
      action: 'scoring.weights_changed',
      summary: `Scoring weights changed to version ${nextVersion}`,
      entityType: 'ScoringRule',
      before: previous,
      after: { weightVersion: nextVersion, categories: dto.categories },
      reason: dto.reason,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    await this.notifyAdmins(organizationId, nextVersion, dto.reason);

    return this.findWeights(organizationId);
  }

  // --- score computation ------------------------------------------------------

  /**
   * Computes and persists one developer's score for a period. Idempotent per
   * (user, period, periodStart, weightVersion) — recomputation overwrites the
   * same row rather than accumulating duplicates.
   */
  async computeDeveloperScore(
    organizationId: string,
    userId: string,
    period: ReturnType<typeof PeriodUtil.resolve>,
    freshness: 'LIVE' | 'PARTIAL' | 'STALE' = 'LIVE',
  ) {
    const weights = await this.findWeights(organizationId);
    const totals = await this.metrics.developerTotals(
      organizationId,
      userId,
      period.start,
      period.end,
    );
    const quality = await this.developerQualityScore(organizationId, userId);

    const categoryScores = this.deriveCategoryScores(totals, quality);
    const totalScore = this.weightedTotal(categoryScores, weights.categories);

    const score = await this.prisma.developerScore.upsert({
      where: {
        userId_period_periodStart_weightVersion: {
          userId,
          period: period.period,
          periodStart: period.start,
          weightVersion: weights.weightVersion,
        },
      },
      update: {
        totalScore: new Prisma.Decimal(totalScore),
        codeQualityScore: new Prisma.Decimal(categoryScores.CODE_QUALITY),
        deliveryScore: new Prisma.Decimal(categoryScores.DELIVERY),
        codeReviewScore: new Prisma.Decimal(categoryScores.CODE_REVIEW),
        testingScore: new Prisma.Decimal(categoryScores.TESTING),
        reliabilityScore: new Prisma.Decimal(categoryScores.RELIABILITY),
        collaborationScore: new Prisma.Decimal(categoryScores.COLLABORATION),
        documentationScore: new Prisma.Decimal(categoryScores.DOCUMENTATION),
        projectImpactScore: new Prisma.Decimal(categoryScores.PROJECT_IMPACT),
        locAdded: totals.locAdded,
        locRemoved: totals.locRemoved,
        freshness,
        computedAt: new Date(),
      },
      create: {
        organizationId,
        userId,
        period: period.period,
        periodStart: period.start,
        periodEnd: period.end,
        weightVersion: weights.weightVersion,
        totalScore: new Prisma.Decimal(totalScore),
        codeQualityScore: new Prisma.Decimal(categoryScores.CODE_QUALITY),
        deliveryScore: new Prisma.Decimal(categoryScores.DELIVERY),
        codeReviewScore: new Prisma.Decimal(categoryScores.CODE_REVIEW),
        testingScore: new Prisma.Decimal(categoryScores.TESTING),
        reliabilityScore: new Prisma.Decimal(categoryScores.RELIABILITY),
        collaborationScore: new Prisma.Decimal(categoryScores.COLLABORATION),
        documentationScore: new Prisma.Decimal(categoryScores.DOCUMENTATION),
        projectImpactScore: new Prisma.Decimal(categoryScores.PROJECT_IMPACT),
        locAdded: totals.locAdded,
        locRemoved: totals.locRemoved,
        freshness,
      },
    });

    return score;
  }

  /**
   * A team score is computed from its members' measured evidence, not by
   * averaging their leaderboard ranks (docs/devlytics.md §5.2) — it aggregates
   * the same category formula over every member's totals.
   */
  async computeTeamScore(
    organizationId: string,
    teamId: string,
    period: ReturnType<typeof PeriodUtil.resolve>,
    freshness: 'LIVE' | 'PARTIAL' | 'STALE' = 'LIVE',
  ) {
    const weights = await this.findWeights(organizationId);
    const members = await this.prisma.teamMember.findMany({
      where: { organizationId, teamId },
      select: { userId: true },
    });

    if (members.length === 0) {
      return this.prisma.teamScore.upsert({
        where: {
          teamId_period_periodStart_weightVersion: {
            teamId,
            period: period.period,
            periodStart: period.start,
            weightVersion: weights.weightVersion,
          },
        },
        update: { memberCount: 0, freshness, computedAt: new Date() },
        create: {
          organizationId,
          teamId,
          period: period.period,
          periodStart: period.start,
          periodEnd: period.end,
          weightVersion: weights.weightVersion,
          memberCount: 0,
          freshness,
        },
      });
    }

    const memberScores: CategoryScores[] = [];
    for (const member of members) {
      const totals = await this.metrics.developerTotals(
        organizationId,
        member.userId,
        period.start,
        period.end,
      );
      const quality = await this.developerQualityScore(
        organizationId,
        member.userId,
      );
      memberScores.push(this.deriveCategoryScores(totals, quality));
    }

    const averaged = SCORE_CATEGORIES.reduce((acc, category) => {
      acc[category] = NumberUtil.average(
        memberScores.map((score) => score[category]),
      );
      return acc;
    }, {} as CategoryScores);

    const totalScore = this.weightedTotal(averaged, weights.categories);

    return this.prisma.teamScore.upsert({
      where: {
        teamId_period_periodStart_weightVersion: {
          teamId,
          period: period.period,
          periodStart: period.start,
          weightVersion: weights.weightVersion,
        },
      },
      update: {
        totalScore: new Prisma.Decimal(totalScore),
        codeQualityScore: new Prisma.Decimal(averaged.CODE_QUALITY),
        deliveryScore: new Prisma.Decimal(averaged.DELIVERY),
        codeReviewScore: new Prisma.Decimal(averaged.CODE_REVIEW),
        testingScore: new Prisma.Decimal(averaged.TESTING),
        reliabilityScore: new Prisma.Decimal(averaged.RELIABILITY),
        collaborationScore: new Prisma.Decimal(averaged.COLLABORATION),
        documentationScore: new Prisma.Decimal(averaged.DOCUMENTATION),
        projectImpactScore: new Prisma.Decimal(averaged.PROJECT_IMPACT),
        memberCount: members.length,
        freshness,
        computedAt: new Date(),
      },
      create: {
        organizationId,
        teamId,
        period: period.period,
        periodStart: period.start,
        periodEnd: period.end,
        weightVersion: weights.weightVersion,
        totalScore: new Prisma.Decimal(totalScore),
        codeQualityScore: new Prisma.Decimal(averaged.CODE_QUALITY),
        deliveryScore: new Prisma.Decimal(averaged.DELIVERY),
        codeReviewScore: new Prisma.Decimal(averaged.CODE_REVIEW),
        testingScore: new Prisma.Decimal(averaged.TESTING),
        reliabilityScore: new Prisma.Decimal(averaged.RELIABILITY),
        collaborationScore: new Prisma.Decimal(averaged.COLLABORATION),
        documentationScore: new Prisma.Decimal(averaged.DOCUMENTATION),
        projectImpactScore: new Prisma.Decimal(averaged.PROJECT_IMPACT),
        memberCount: members.length,
        freshness,
      },
    });
  }

  /** Recomputes every active developer and team for one period in one pass. */
  async recomputeOrganization(
    organizationId: string,
    period: ReturnType<typeof PeriodUtil.resolve>,
    freshness: 'LIVE' | 'PARTIAL' | 'STALE' = 'LIVE',
  ): Promise<{ developers: number; teams: number }> {
    const [members, teams] = await Promise.all([
      this.prisma.organizationUser.findMany({
        where: { organizationId, status: 'ACTIVE' },
        select: { userId: true },
      }),
      this.prisma.team.findMany({
        where: { organizationId, status: 'ACTIVE' },
        select: { id: true },
      }),
    ]);

    for (const member of members) {
      await this.computeDeveloperScore(
        organizationId,
        member.userId,
        period,
        freshness,
      );
    }
    for (const team of teams) {
      await this.computeTeamScore(organizationId, team.id, period, freshness);
    }

    return { developers: members.length, teams: teams.length };
  }

  /** Category formula shared by developers and teams. LOC never appears here. */
  private deriveCategoryScores(
    totals: MetricTotals,
    qualityScore: number | null,
  ): CategoryScores {
    const reviewParticipation = totals.prsCreated
      ? NumberUtil.normalize(totals.prsReviewed, totals.prsCreated * 2)
      : NumberUtil.normalize(
          totals.reviewsGiven,
          SCORE_REFERENCE.REVIEWS_GIVEN,
        );

    const reliability = totals.builds
      ? NumberUtil.percent(totals.successfulBuilds, totals.builds)
      : 100;

    return {
      CODE_QUALITY: qualityScore ?? 0,
      DELIVERY: NumberUtil.average([
        NumberUtil.normalize(totals.prsMerged, SCORE_REFERENCE.MERGED_PRS),
        NumberUtil.normalize(totals.commits, SCORE_REFERENCE.COMMITS),
      ]),
      CODE_REVIEW: NumberUtil.average([
        NumberUtil.normalize(
          totals.reviewsGiven,
          SCORE_REFERENCE.REVIEWS_GIVEN,
        ),
        reviewParticipation,
      ]),
      TESTING: NumberUtil.normalize(
        totals.testsAdded + totals.testsChanged,
        SCORE_REFERENCE.TEST_CHANGES,
      ),
      RELIABILITY: NumberUtil.clampScore(reliability),
      COLLABORATION: NumberUtil.normalize(
        totals.reviewsGiven + totals.prsReviewed,
        SCORE_REFERENCE.COLLABORATION_EVENTS,
      ),
      DOCUMENTATION: NumberUtil.normalize(
        totals.docsChanged,
        SCORE_REFERENCE.DOC_CHANGES,
      ),
      PROJECT_IMPACT: NumberUtil.normalize(
        totals.issuesResolved,
        SCORE_REFERENCE.ISSUES_RESOLVED,
      ),
    };
  }

  private weightedTotal(
    scores: CategoryScores,
    weights: { category: ScoreCategory; weightPercent: number }[],
  ): number {
    const total = weights.reduce(
      (sum, weight) =>
        sum + (scores[weight.category] ?? 0) * (weight.weightPercent / 100),
      0,
    );
    return NumberUtil.clampScore(total);
  }

  /** Average of the developer's own repositories' latest quality scores. */
  private async developerQualityScore(
    organizationId: string,
    userId: string,
  ): Promise<number | null> {
    const repoIds = await this.prisma.repositoryMember.findMany({
      where: { organizationId, userId },
      select: { repositoryId: true },
    });
    if (repoIds.length === 0) return null;

    const snapshots = await this.prisma.codeQualitySnapshot.findMany({
      where: {
        organizationId,
        repositoryId: { in: repoIds.map((r) => r.repositoryId) },
      },
      orderBy: { snapshotDate: 'desc' },
    });

    const latestByRepo = new Map<string, (typeof snapshots)[number]>();
    for (const snapshot of snapshots) {
      if (!latestByRepo.has(snapshot.repositoryId))
        latestByRepo.set(snapshot.repositoryId, snapshot);
    }
    const values = [...latestByRepo.values()].map((s) =>
      NumberUtil.toNumber(s.qualityScore),
    );
    return values.length ? NumberUtil.average(values) : null;
  }

  private async notifyAdmins(
    organizationId: string,
    weightVersion: number,
    reason?: string,
  ) {
    const admins = await this.prisma.organizationUser.findMany({
      where: {
        organizationId,
        role: { key: 'ORGANIZATION_ADMIN' },
        status: 'ACTIVE',
      },
      select: { userId: true },
    });
    await this.notifications.notifyMany(
      admins.map((admin) => ({
        organizationId,
        userId: admin.userId,
        event: NotificationEvent.SCORING_RULES_CHANGED,
        title: `Scoring weights updated to version ${weightVersion}`,
        body: reason ?? 'Scoring category weights were changed.',
        channel: 'EMAIL' as const,
        actionUrl: '/settings/scoring-rules',
      })),
    );
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma, QualityIssueStatus } from '@prisma/client';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { NumberUtil } from '../common/utils/number.util';
import { PeriodUtil } from '../common/utils/period.util';
import { QueryUtil } from '../common/utils/query.util';
import { PrismaService } from '../database/prisma.service';
import { HistoryQueryDto, InsightsScopeQueryDto, ProblemsQueryDto } from './dto/insights.dto';
import { MetricCalculationService } from './metric-calculation.service';

const OPEN_ISSUE_STATUSES: QualityIssueStatus[] = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'];
const HISTORY_SORTABLE = ['completedAt', 'createdAt', 'title'] as const;
const TREND_MONTHS = 6;

function toDecimalNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : NumberUtil.toNumber(value as Prisma.Decimal);
}

/**
 * Read-side aggregation for the Improvement Engine's dashboard, problems and
 * history views (pasted spec §27-29). Every value here is computed from stored
 * rows — nothing is estimated for display.
 */
@Injectable()
export class ImprovementInsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricCalculation: MetricCalculationService,
  ) {}

  async dashboard(organizationId: string, query: InsightsScopeQueryDto) {
    const { start, end } = PeriodUtil.range(query.from, query.to, 30);
    const experimentScope = QueryUtil.compact({
      teamId: query.teamId,
      projectId: query.projectId,
      repositoryId: query.repositoryId,
      userId: query.userId,
    });
    const repositoryIds = await this.metricCalculation.resolveRepositoryIds(organizationId, {
      teamId: query.teamId,
      projectId: query.projectId,
      repositoryId: query.repositoryId,
    });

    const experimentBase: Prisma.EngineeringExperimentWhereInput = { organizationId, ...experimentScope };
    const issueBase: Prisma.CodeQualityIssueWhereInput = {
      organizationId,
      status: { in: OPEN_ISSUE_STATUSES },
      ...(repositoryIds ? { repositoryId: { in: repositoryIds } } : {}),
    };

    const [activeCount, provenCount, completedTotal, problemsDetected, activeExperiments, recommendations, recentProofs] =
      await this.prisma.$transaction([
        this.prisma.engineeringExperiment.count({ where: { ...experimentBase, status: 'ACTIVE' } }),
        this.prisma.engineeringExperiment.count({ where: { ...experimentBase, status: 'PROVEN' } }),
        this.prisma.engineeringExperiment.count({ where: { ...experimentBase, status: { in: ['PROVEN', 'FAILED'] } } }),
        this.prisma.codeQualityIssue.count({ where: issueBase }),
        this.prisma.engineeringExperiment.findMany({
          where: { ...experimentBase, status: 'ACTIVE' },
          orderBy: { startDate: 'desc' },
          take: 5,
          include: { metrics: { where: { isPrimary: true }, take: 1 } },
        }),
        this.prisma.improvementRecommendation.findMany({
          where: { organizationId, status: 'PROPOSED' },
          orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
          take: 5,
        }),
        this.prisma.improvementProof.findMany({
          where: { organizationId, verifiedAt: { not: null }, experiment: experimentScope },
          orderBy: { verifiedAt: 'desc' },
          take: 5,
          include: { experiment: { select: { id: true, title: true } } },
        }),
      ]);

    // QualityCategory has only 10 values, so grouping without a take/orderBy and
    // sorting in JS is simpler than fighting Prisma's aggregate-orderBy typing.
    const topProblemsGroups = await this.prisma.codeQualityIssue.groupBy({
      by: ['category'],
      where: issueBase,
      _count: true,
    });
    const topProblemsRaw = topProblemsGroups.sort((a, b) => b._count - a._count).slice(0, 5);

    const trendProofs = await this.prisma.improvementProof.findMany({
      where: {
        organizationId,
        verifiedAt: { gte: PeriodUtil.addDays(start, -30 * (TREND_MONTHS - 1)) },
        experiment: experimentScope,
      },
      select: { verifiedAt: true, targetAchieved: true },
    });

    return {
      summary: {
        activeExperiments: activeCount,
        problemsDetected,
        improvementsProven: provenCount,
        improvementRate: completedTotal ? NumberUtil.percent(provenCount, completedTotal) : 0,
      },
      activeExperiments: activeExperiments.map((experiment) => ({
        id: experiment.id,
        title: experiment.title,
        status: experiment.status,
        startDate: experiment.startDate,
        endDate: experiment.endDate,
        primaryMetric: experiment.metrics[0]
          ? {
              metricKey: experiment.metrics[0].metricKey,
              baselineValue: toDecimalNumber(experiment.metrics[0].baselineValue),
              targetValue: toDecimalNumber(experiment.metrics[0].targetValue),
              currentValue: toDecimalNumber(experiment.metrics[0].currentValue),
            }
          : null,
      })),
      topProblems: topProblemsRaw.map((row) => ({ category: row.category, openCount: row._count })),
      recommendations,
      recentProofs: recentProofs.map((proof) => ({
        experimentId: proof.experimentId,
        experimentTitle: proof.experiment.title,
        verificationStatus: proof.verificationStatus,
        targetAchieved: proof.targetAchieved,
        improvementPercentage: toDecimalNumber(proof.improvementPercentage),
        confidence: proof.confidence,
        verifiedAt: proof.verifiedAt,
      })),
      improvementTrend: this.bucketByMonth(trendProofs, start, end),
      period: { from: PeriodUtil.toDateOnly(start), to: PeriodUtil.toDateOnly(end) },
    };
  }

  async problems(organizationId: string, query: ProblemsQueryDto) {
    const repositoryIds = await this.metricCalculation.resolveRepositoryIds(organizationId, {
      teamId: query.teamId,
      repositoryId: query.repositoryId,
    });

    const where: Prisma.CodeQualityIssueWhereInput = {
      organizationId,
      status: { in: OPEN_ISSUE_STATUSES },
      ...(repositoryIds ? { repositoryId: { in: repositoryIds } } : {}),
      ...QueryUtil.compact({ severity: query.severity }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.codeQualityIssue.findMany({
        where,
        orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        skip: query.skip,
        take: query.limit,
        include: { repository: { select: { id: true, name: true, fullName: true } } },
      }),
      this.prisma.codeQualityIssue.count({ where }),
    ]);

    return PaginatedResult.from(
      items.map((issue) => ({
        id: issue.id,
        problem: issue.title,
        severity: issue.severity,
        metric: issue.category,
        currentValue: toDecimalNumber(issue.measuredValue),
        observedFact: issue.observedFact,
        aiInference: issue.aiInference,
        confidence: this.confidenceBucket(toDecimalNumber(issue.aiConfidence)),
        evidenceSummary: issue.observedFact,
        repository: issue.repository,
        detectedAt: issue.createdAt,
      })),
      total,
      query,
    );
  }

  async history(organizationId: string, query: HistoryQueryDto) {
    const where: Prisma.EngineeringExperimentWhereInput = {
      organizationId,
      status: query.status ? query.status : { in: ['COMPLETED', 'PROVEN', 'FAILED'] },
      ...QueryUtil.compact({
        userId: query.userId,
        teamId: query.teamId,
        projectId: query.projectId,
        repositoryId: query.repositoryId,
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.engineeringExperiment.findMany({
        where,
        orderBy: QueryUtil.orderBy(query.sortBy, query.sortOrder, HISTORY_SORTABLE, 'completedAt'),
        skip: query.skip,
        take: query.limit,
        include: {
          metrics: { where: { isPrimary: true }, take: 1 },
          proof: true,
        },
      }),
      this.prisma.engineeringExperiment.count({ where }),
    ]);

    return PaginatedResult.from(
      items.map((experiment) => ({
        id: experiment.id,
        title: experiment.title,
        status: experiment.status,
        startDate: experiment.startDate,
        endDate: experiment.endDate,
        completedAt: experiment.completedAt,
        primaryMetric: experiment.metrics[0]
          ? {
              metricKey: experiment.metrics[0].metricKey,
              baselineValue: toDecimalNumber(experiment.metrics[0].baselineValue),
              targetValue: toDecimalNumber(experiment.metrics[0].targetValue),
              finalValue: toDecimalNumber(experiment.metrics[0].finalValue),
            }
          : null,
        result: experiment.proof
          ? {
              verificationStatus: experiment.proof.verificationStatus,
              targetAchieved: experiment.proof.targetAchieved,
              improvementPercentage: toDecimalNumber(experiment.proof.improvementPercentage),
              confidence: experiment.proof.confidence,
            }
          : null,
      })),
      total,
      query,
    );
  }

  private confidenceBucket(value: number | null): 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA' {
    if (value === null) return 'INSUFFICIENT_DATA';
    if (value >= 0.8) return 'HIGH';
    if (value >= 0.5) return 'MEDIUM';
    return 'LOW';
  }

  private bucketByMonth(
    proofs: { verifiedAt: Date | null; targetAchieved: boolean }[],
    start: Date,
    end: Date,
  ): { month: string; proven: number; failed: number }[] {
    const buckets = new Map<string, { proven: number; failed: number }>();
    for (let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)); cursor <= end; cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))) {
      buckets.set(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`, { proven: 0, failed: 0 });
    }
    for (const proof of proofs) {
      if (!proof.verifiedAt) continue;
      const key = `${proof.verifiedAt.getUTCFullYear()}-${String(proof.verifiedAt.getUTCMonth() + 1).padStart(2, '0')}`;
      const bucket = buckets.get(key);
      if (!bucket) continue;
      if (proof.targetAchieved) bucket.proven += 1;
      else bucket.failed += 1;
    }
    return Array.from(buckets.entries()).map(([month, counts]) => ({ month, ...counts }));
  }
}

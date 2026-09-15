import { Injectable } from '@nestjs/common';
import { IssueSeverity, Prisma, PipelineStatus } from '@prisma/client';
import { NumberUtil } from '../common/utils/number.util';
import { PrismaService } from '../database/prisma.service';
import { ExperimentMetricKey } from './dto/experiments.dto';

export interface MetricScope {
  userId?: string | null;
  teamId?: string | null;
  projectId?: string | null;
  repositoryId?: string | null;
}

export interface MetricCalculationResult {
  value: number | null;
  sampleSize: number;
  insufficientData: boolean;
}

/** Below this many observations a value is reported as INSUFFICIENT_DATA rather than trusted. */
const MIN_SAMPLE_SIZE = 3;
/** Hard cap on rows pulled into JS for duration/size averages — bounds worst case on wide date ranges. */
const ROW_LIMIT = 5000;

const insufficient: MetricCalculationResult = { value: null, sampleSize: 0, insufficientData: true };

function finish(values: number[]): MetricCalculationResult {
  if (values.length < MIN_SAMPLE_SIZE) return { value: null, sampleSize: values.length, insufficientData: true };
  return { value: NumberUtil.round(NumberUtil.average(values), 4), sampleSize: values.length, insufficientData: false };
}

function hoursBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

/**
 * Derives an experiment metric's value from real, stored engineering activity —
 * never from an invented or estimated number. Returns `insufficientData: true`
 * instead of guessing when there are too few observations to trust.
 *
 * `lead_time`, `ci_wait_time` and `bug_rate` are documented approximations
 * (docs pasted spec §16/§17): the schema does not carry an explicit
 * commit→deployment link or a CI queued-time field, so these use the closest
 * honest proxy available and say so in the caller's evidence payload.
 */
@Injectable()
export class MetricCalculationService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(
    organizationId: string,
    metricKey: ExperimentMetricKey,
    scope: MetricScope,
    start: Date,
    end: Date,
  ): Promise<MetricCalculationResult> {
    const repositoryIds = await this.resolveRepositoryIds(organizationId, scope);
    if (repositoryIds && repositoryIds.length === 0) return insufficient;

    switch (metricKey) {
      case 'review_cycle_time':
        return this.reviewCycleTime(organizationId, scope, repositoryIds, start, end);
      case 'pr_size':
        return this.prAggregate(organizationId, scope, repositoryIds, start, end, (pr) => pr.additions + pr.deletions);
      case 'files_changed_per_pr':
        return this.prAggregate(organizationId, scope, repositoryIds, start, end, (pr) => pr.changedFiles);
      case 'reviewer_load':
        return this.reviewerLoad(organizationId, scope, repositoryIds, start, end);
      case 'ci_wait_time':
        return this.ciWaitTime(organizationId, repositoryIds, start, end);
      case 'deployment_frequency':
        return this.deploymentFrequency(organizationId, repositoryIds, start, end);
      case 'deployment_failure_rate':
        return this.deploymentFailureRate(organizationId, repositoryIds, start, end);
      case 'lead_time':
        return this.leadTime(organizationId, scope, repositoryIds, start, end);
      case 'commit_frequency':
        return this.commitFrequency(organizationId, scope, repositoryIds, start, end);
      case 'code_quality_score':
        return this.snapshotAverage(organizationId, scope, repositoryIds, start, end, (s) => NumberUtil.toNumber(s.qualityScore));
      case 'test_coverage':
        return this.snapshotAverage(organizationId, scope, repositoryIds, start, end, (s) => NumberUtil.toNumber(s.coveragePercent));
      case 'bug_rate':
        return this.snapshotAverage(
          organizationId,
          scope,
          repositoryIds,
          start,
          end,
          (s) => (s.locTotal > 0 ? (s.bugs / s.locTotal) * 1000 : null),
        );
      case 'quality_issue_count':
        return this.issueCount(organizationId, scope, repositoryIds, start, end);
      case 'critical_issue_count':
        return this.issueCount(organizationId, scope, repositoryIds, start, end, ['BLOCKER', 'CRITICAL']);
      case 'build_success_rate':
        return this.buildSuccessRate(organizationId, scope, repositoryIds, start, end);
      default:
        return insufficient;
    }
  }

  /** repositoryId wins if given; otherwise team/project scope resolves to their owned repositories. Org-wide when none is given. */
  async resolveRepositoryIds(organizationId: string, scope: MetricScope): Promise<string[] | undefined> {
    if (scope.repositoryId) return [scope.repositoryId];
    if (scope.projectId) {
      const repos = await this.prisma.repository.findMany({
        where: { organizationId, projectId: scope.projectId },
        select: { id: true },
      });
      return repos.map((r) => r.id);
    }
    if (scope.teamId) {
      const repos = await this.prisma.repository.findMany({
        where: { organizationId, teamId: scope.teamId },
        select: { id: true },
      });
      return repos.map((r) => r.id);
    }
    return undefined;
  }

  private async reviewCycleTime(
    organizationId: string,
    scope: MetricScope,
    repositoryIds: string[] | undefined,
    start: Date,
    end: Date,
  ): Promise<MetricCalculationResult> {
    const rows = await this.prisma.pullRequest.findMany({
      where: {
        organizationId,
        createdAtExternal: { gte: start, lte: end },
        firstReviewAt: { not: null },
        ...(repositoryIds ? { repositoryId: { in: repositoryIds } } : {}),
        ...(scope.userId ? { authorId: scope.userId } : {}),
      },
      select: { createdAtExternal: true, firstReviewAt: true },
      take: ROW_LIMIT,
    });
    return finish(rows.map((r) => hoursBetween(r.createdAtExternal, r.firstReviewAt as Date)));
  }

  private async prAggregate(
    organizationId: string,
    scope: MetricScope,
    repositoryIds: string[] | undefined,
    start: Date,
    end: Date,
    pick: (pr: { additions: number; deletions: number; changedFiles: number }) => number,
  ): Promise<MetricCalculationResult> {
    const rows = await this.prisma.pullRequest.findMany({
      where: {
        organizationId,
        createdAtExternal: { gte: start, lte: end },
        ...(repositoryIds ? { repositoryId: { in: repositoryIds } } : {}),
        ...(scope.userId ? { authorId: scope.userId } : {}),
      },
      select: { additions: true, deletions: true, changedFiles: true },
      take: ROW_LIMIT,
    });
    return finish(rows.map(pick));
  }

  private async reviewerLoad(
    organizationId: string,
    scope: MetricScope,
    repositoryIds: string[] | undefined,
    start: Date,
    end: Date,
  ): Promise<MetricCalculationResult> {
    const rows = await this.prisma.pullRequestReview.groupBy({
      by: ['reviewerId'],
      where: {
        organizationId,
        submittedAt: { gte: start, lte: end },
        reviewerId: scope.userId ? scope.userId : { not: null },
        ...(repositoryIds ? { pullRequest: { repositoryId: { in: repositoryIds } } } : {}),
      },
      _count: true,
    });
    if (rows.length === 0) return insufficient;
    return finish(rows.map((r) => r._count));
  }

  private async ciWaitTime(
    organizationId: string,
    repositoryIds: string[] | undefined,
    start: Date,
    end: Date,
  ): Promise<MetricCalculationResult> {
    const rows = await this.prisma.ciPipeline.findMany({
      where: {
        organizationId,
        createdAt: { gte: start, lte: end },
        durationSeconds: { not: null },
        ...(repositoryIds ? { repositoryId: { in: repositoryIds } } : {}),
      },
      select: { durationSeconds: true },
      take: ROW_LIMIT,
    });
    return finish(rows.map((r) => (r.durationSeconds as number) / 60));
  }

  private async deploymentFrequency(
    organizationId: string,
    repositoryIds: string[] | undefined,
    start: Date,
    end: Date,
  ): Promise<MetricCalculationResult> {
    const count = await this.prisma.deployment.count({
      where: {
        organizationId,
        deployedAt: { gte: start, lte: end },
        ...(repositoryIds ? { repositoryId: { in: repositoryIds } } : {}),
      },
    });
    if (count === 0) return insufficient;
    const weeks = Math.max(1, (end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return { value: NumberUtil.round(count / weeks, 4), sampleSize: count, insufficientData: false };
  }

  private async deploymentFailureRate(
    organizationId: string,
    repositoryIds: string[] | undefined,
    start: Date,
    end: Date,
  ): Promise<MetricCalculationResult> {
    const where = {
      organizationId,
      deployedAt: { gte: start, lte: end },
      ...(repositoryIds ? { repositoryId: { in: repositoryIds } } : {}),
    };
    const [total, failed] = await this.prisma.$transaction([
      this.prisma.deployment.count({ where }),
      this.prisma.deployment.count({ where: { ...where, status: 'FAILED' } }),
    ]);
    if (total < MIN_SAMPLE_SIZE) return { value: null, sampleSize: total, insufficientData: true };
    return { value: NumberUtil.percent(failed, total), sampleSize: total, insufficientData: false };
  }

  private async leadTime(
    organizationId: string,
    scope: MetricScope,
    repositoryIds: string[] | undefined,
    start: Date,
    end: Date,
  ): Promise<MetricCalculationResult> {
    const rows = await this.prisma.pullRequest.findMany({
      where: {
        organizationId,
        status: 'MERGED',
        mergedAt: { gte: start, lte: end, not: null },
        ...(repositoryIds ? { repositoryId: { in: repositoryIds } } : {}),
        ...(scope.userId ? { authorId: scope.userId } : {}),
      },
      select: { createdAtExternal: true, mergedAt: true },
      take: ROW_LIMIT,
    });
    return finish(rows.map((r) => hoursBetween(r.createdAtExternal, r.mergedAt as Date)));
  }

  private async commitFrequency(
    organizationId: string,
    scope: MetricScope,
    repositoryIds: string[] | undefined,
    start: Date,
    end: Date,
  ): Promise<MetricCalculationResult> {
    const count = await this.prisma.commit.count({
      where: {
        organizationId,
        isBot: false,
        committedAt: { gte: start, lte: end },
        ...(repositoryIds ? { repositoryId: { in: repositoryIds } } : {}),
        ...(scope.userId ? { authorId: scope.userId } : {}),
      },
    });
    if (count === 0) return insufficient;
    const weeks = Math.max(1, (end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return { value: NumberUtil.round(count / weeks, 4), sampleSize: count, insufficientData: false };
  }

  private async snapshotAverage(
    organizationId: string,
    scope: MetricScope,
    repositoryIds: string[] | undefined,
    start: Date,
    end: Date,
    pick: (s: { qualityScore: Prisma.Decimal; coveragePercent: Prisma.Decimal; bugs: number; locTotal: number }) => number | null,
  ): Promise<MetricCalculationResult> {
    const rows = await this.prisma.codeQualitySnapshot.findMany({
      where: {
        organizationId,
        snapshotDate: { gte: start, lte: end },
        ...(repositoryIds ? { repositoryId: { in: repositoryIds } } : {}),
      },
      select: { qualityScore: true, coveragePercent: true, bugs: true, locTotal: true },
      take: ROW_LIMIT,
    });
    const values = rows.map(pick).filter((v): v is number => v !== null);
    return finish(values);
  }

  private async issueCount(
    organizationId: string,
    scope: MetricScope,
    repositoryIds: string[] | undefined,
    start: Date,
    end: Date,
    severities?: IssueSeverity[],
  ): Promise<MetricCalculationResult> {
    const count = await this.prisma.codeQualityIssue.count({
      where: {
        organizationId,
        createdAt: { gte: start, lte: end },
        ...(repositoryIds ? { repositoryId: { in: repositoryIds } } : {}),
        ...(scope.userId ? { assignedUserId: scope.userId } : {}),
        ...(severities ? { severity: { in: severities } } : {}),
      },
    });
    return { value: count, sampleSize: count, insufficientData: false };
  }

  private async buildSuccessRate(
    organizationId: string,
    scope: MetricScope,
    repositoryIds: string[] | undefined,
    start: Date,
    end: Date,
  ): Promise<MetricCalculationResult> {
    // A developer's own build success rate isn't derivable from CiPipeline (no author
    // link) — use the daily metric rollup instead when the scope is a bare developer.
    if (scope.userId && !repositoryIds) {
      const rows = await this.prisma.developerDailyMetric.aggregate({
        where: { organizationId, userId: scope.userId, metricDate: { gte: start, lte: end } },
        _sum: { builds: true, successfulBuilds: true },
      });
      const total = rows._sum.builds ?? 0;
      const succeeded = rows._sum.successfulBuilds ?? 0;
      if (total < MIN_SAMPLE_SIZE) return { value: null, sampleSize: total, insufficientData: true };
      return { value: NumberUtil.percent(succeeded, total), sampleSize: total, insufficientData: false };
    }

    const finishedStatuses: PipelineStatus[] = ['SUCCESS', 'FAILED'];
    const where = {
      organizationId,
      createdAt: { gte: start, lte: end },
      status: { in: finishedStatuses },
      ...(repositoryIds ? { repositoryId: { in: repositoryIds } } : {}),
    };
    const [total, succeeded] = await this.prisma.$transaction([
      this.prisma.ciPipeline.count({ where }),
      this.prisma.ciPipeline.count({ where: { ...where, status: 'SUCCESS' } }),
    ]);
    if (total < MIN_SAMPLE_SIZE) return { value: null, sampleSize: total, insufficientData: true };
    return { value: NumberUtil.percent(succeeded, total), sampleSize: total, insufficientData: false };
  }
}

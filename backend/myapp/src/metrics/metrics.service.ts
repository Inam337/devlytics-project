import { Injectable } from '@nestjs/common';
import { NumberUtil } from '../common/utils/number.util';
import { PeriodUtil } from '../common/utils/period.util';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../database/prisma.service';
import { MetricsAggregationService } from './metrics-aggregation.service';
import { MetricsQueryDto } from './dto/metrics-query.dto';

/**
 * Read side of engineering metrics. Values come from the daily-metric tables
 * that `MetricsAggregationService` maintains — nothing here recomputes from
 * raw activity, so a metric always matches what scoring saw.
 */
@Injectable()
export class MetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aggregation: MetricsAggregationService,
  ) {}

  async developers(organizationId: string, query: MetricsQueryDto) {
    const { start, end } = PeriodUtil.range(query.from, query.to);

    const memberships = await this.prisma.organizationUser.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        ...(query.teamId ? { user: { teamMemberships: { some: { teamId: query.teamId } } } } : {}),
      },
      select: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      take: query.limit,
      skip: query.skip,
    });

    const userIds = memberships.map((membership) => membership.user.id);
    const totals = await this.aggregation.developerTotalsBulk(organizationId, userIds, start, end);

    return memberships.map((membership) => ({
      user: membership.user,
      period: { from: PeriodUtil.toDateOnly(start), to: PeriodUtil.toDateOnly(end) },
      metrics: totals.get(membership.user.id) ?? emptyTotals(),
    }));
  }

  async developerOne(organizationId: string, userId: string, query: MetricsQueryDto) {
    const membership = await this.prisma.organizationUser.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
    if (!membership) throw AppException.notFound('Developer', userId);

    const { start, end } = PeriodUtil.range(query.from, query.to);
    const metrics = await this.aggregation.developerTotals(organizationId, userId, start, end);
    const daily = await this.dailySeries(organizationId, userId, start, end);

    return {
      user: membership.user,
      period: { from: PeriodUtil.toDateOnly(start), to: PeriodUtil.toDateOnly(end) },
      metrics,
      trend: daily,
    };
  }

  async teams(organizationId: string, query: MetricsQueryDto) {
    const { start, end } = PeriodUtil.range(query.from, query.to);
    const teams = await this.prisma.team.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      },
      select: { id: true, name: true, code: true, teamColor: true },
      take: query.limit,
      skip: query.skip,
    });

    return Promise.all(
      teams.map(async (team) => ({
        team,
        period: { from: PeriodUtil.toDateOnly(start), to: PeriodUtil.toDateOnly(end) },
        metrics: await this.aggregation.teamTotals(organizationId, team.id, start, end),
      })),
    );
  }

  async teamOne(organizationId: string, teamId: string, query: MetricsQueryDto) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, organizationId },
      select: { id: true, name: true, code: true, teamColor: true },
    });
    if (!team) throw AppException.notFound('Team', teamId);

    const { start, end } = PeriodUtil.range(query.from, query.to);
    const metrics = await this.aggregation.teamTotals(organizationId, teamId, start, end);

    return { team, period: { from: PeriodUtil.toDateOnly(start), to: PeriodUtil.toDateOnly(end) }, metrics };
  }

  async repositoryOne(organizationId: string, repositoryId: string, query: MetricsQueryDto) {
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, organizationId },
      select: { id: true, name: true, fullName: true },
    });
    if (!repository) throw AppException.notFound('Repository', repositoryId);

    const { start, end } = PeriodUtil.range(query.from, query.to);
    const [commits, prs, reviews, issues] = await this.prisma.$transaction([
      this.prisma.commit.count({
        where: { organizationId, repositoryId, isBot: false, committedAt: { gte: start, lte: end } },
      }),
      this.prisma.pullRequest.count({
        where: { organizationId, repositoryId, createdAtExternal: { gte: start, lte: end } },
      }),
      this.prisma.pullRequestReview.count({
        where: {
          organizationId,
          pullRequest: { repositoryId },
          submittedAt: { gte: start, lte: end },
        },
      }),
      this.prisma.issue.count({
        where: { organizationId, repositoryId, createdAtExternal: { gte: start, lte: end } },
      }),
    ]);

    // Run separately: mixing groupBy into a $transaction tuple with other
    // query kinds collapses Prisma's per-call return-type inference.
    const pipelineSummary = await this.prisma.ciPipeline.groupBy({
      by: ['status'],
      where: { organizationId, repositoryId, createdAt: { gte: start, lte: end } },
      orderBy: { status: 'asc' },
      _count: true,
    });

    const finished = pipelineSummary
      .filter((row) => row.status === 'SUCCESS' || row.status === 'FAILED')
      .reduce((sum, row) => sum + (row._count ?? 0), 0);
    const succeeded = pipelineSummary.find((row) => row.status === 'SUCCESS')?._count ?? 0;

    return {
      repository,
      period: { from: PeriodUtil.toDateOnly(start), to: PeriodUtil.toDateOnly(end) },
      metrics: {
        commits,
        pullRequests: prs,
        reviews,
        issues,
        ciSuccessRate: finished ? NumberUtil.percent(succeeded, finished) : null,
      },
    };
  }

  private async dailySeries(organizationId: string, userId: string, start: Date, end: Date) {
    const rows = await this.prisma.developerDailyMetric.findMany({
      where: { organizationId, userId, metricDate: { gte: start, lte: end } },
      orderBy: { metricDate: 'asc' },
      select: {
        metricDate: true,
        commits: true,
        prsMerged: true,
        reviewsGiven: true,
        locAdded: true,
        locRemoved: true,
      },
    });
    const byDate = new Map(rows.map((row) => [PeriodUtil.toDateOnly(row.metricDate), row]));

    return PeriodUtil.eachDay(start, end).map((day) => {
      const key = PeriodUtil.toDateOnly(day);
      const row = byDate.get(key);
      return {
        date: key,
        commits: row?.commits ?? 0,
        prsMerged: row?.prsMerged ?? 0,
        reviewsGiven: row?.reviewsGiven ?? 0,
        // Reported as an activity trend only — never a scoring input.
        linesOfCode: (row?.locAdded ?? 0) + (row?.locRemoved ?? 0),
      };
    });
  }
}

function emptyTotals() {
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
  };
}

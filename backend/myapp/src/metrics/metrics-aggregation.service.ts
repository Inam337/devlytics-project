import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PeriodUtil } from '../common/utils/period.util';
import { PrismaService } from '../database/prisma.service';

export interface AggregationWindow {
  organizationId: string;
  start: Date;
  end: Date;
}

/**
 * Rebuilds `tbl_developer_daily_metric` and `tbl_team_daily_metric` from raw
 * engineering activity.
 *
 * The aggregation runs as set-based SQL rather than per-developer queries: a
 * twelve-month backfill of a busy organization is one statement per grain
 * instead of thousands of round trips.
 *
 * Automation accounts are excluded at the source (`is_bot = false`), so a bot
 * can never contribute to a metric and therefore never to a score.
 */
@Injectable()
export class MetricsAggregationService {
  private readonly logger = new Logger(MetricsAggregationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Recomputes developer and team metrics for a window. Idempotent. */
  async rebuild(
    window: AggregationWindow,
  ): Promise<{ developerRows: number; teamRows: number }> {
    const developerRows = await this.rebuildDeveloperMetrics(window);
    const teamRows = await this.rebuildTeamMetrics(window);

    this.logger.log(
      `Rebuilt metrics for ${window.organizationId} between ${PeriodUtil.toDateOnly(
        window.start,
      )} and ${PeriodUtil.toDateOnly(window.end)}: ${developerRows} developer rows, ${teamRows} team rows`,
    );
    return { developerRows, teamRows };
  }

  /** Convenience wrapper used after a repository sync completes. */
  async rebuildRecent(organizationId: string, days = 400) {
    const end = PeriodUtil.startOfUtcDay(new Date());
    const start = PeriodUtil.addDays(end, -days);
    return this.rebuild({ organizationId, start, end });
  }

  private async rebuildDeveloperMetrics(
    window: AggregationWindow,
  ): Promise<number> {
    const { organizationId, start, end } = window;

    return this.prisma.$executeRaw`
      WITH commit_stats AS (
        SELECT c.author_id AS user_id,
               (c.committed_at AT TIME ZONE 'UTC')::date AS metric_date,
               COUNT(*)::int AS commits,
               COALESCE(SUM(c.additions), 0)::int AS loc_added,
               COALESCE(SUM(c.deletions), 0)::int AS loc_removed,
               COALESCE(SUM(c.changed_files), 0)::int AS files_changed
        FROM tbl_commit c
        WHERE c.organization_id = ${organizationId}::uuid
          AND c.author_id IS NOT NULL
          AND c.is_bot = false
          AND (c.committed_at AT TIME ZONE 'UTC')::date BETWEEN ${start}::date AND ${end}::date
        GROUP BY 1, 2
      ),
      file_stats AS (
        SELECT c.author_id AS user_id,
               (c.committed_at AT TIME ZONE 'UTC')::date AS metric_date,
               COUNT(*) FILTER (WHERE f.is_test_file AND f.change_type = 'added')::int AS tests_added,
               COUNT(*) FILTER (WHERE f.is_test_file)::int AS tests_changed,
               COUNT(*) FILTER (WHERE f.is_doc_file)::int AS docs_changed
        FROM tbl_commit_file f
        JOIN tbl_commit c ON c.id = f.commit_id
        WHERE c.organization_id = ${organizationId}::uuid
          AND c.author_id IS NOT NULL
          AND c.is_bot = false
          AND (c.committed_at AT TIME ZONE 'UTC')::date BETWEEN ${start}::date AND ${end}::date
        GROUP BY 1, 2
      ),
      pr_created AS (
        SELECT p.author_id AS user_id,
               (p.created_at_external AT TIME ZONE 'UTC')::date AS metric_date,
               COUNT(*)::int AS prs_created
        FROM tbl_pull_request p
        WHERE p.organization_id = ${organizationId}::uuid
          AND p.author_id IS NOT NULL
          AND (p.created_at_external AT TIME ZONE 'UTC')::date BETWEEN ${start}::date AND ${end}::date
        GROUP BY 1, 2
      ),
      pr_merged AS (
        SELECT p.author_id AS user_id,
               (p.merged_at AT TIME ZONE 'UTC')::date AS metric_date,
               COUNT(*)::int AS prs_merged
        FROM tbl_pull_request p
        WHERE p.organization_id = ${organizationId}::uuid
          AND p.author_id IS NOT NULL
          AND p.merged_at IS NOT NULL
          AND (p.merged_at AT TIME ZONE 'UTC')::date BETWEEN ${start}::date AND ${end}::date
        GROUP BY 1, 2
      ),
      review_stats AS (
        SELECT r.reviewer_id AS user_id,
               (r.submitted_at AT TIME ZONE 'UTC')::date AS metric_date,
               COUNT(*)::int AS reviews_given,
               COUNT(DISTINCT r.pull_request_id)::int AS prs_reviewed
        FROM tbl_pull_request_review r
        WHERE r.organization_id = ${organizationId}::uuid
          AND r.reviewer_id IS NOT NULL
          AND (r.submitted_at AT TIME ZONE 'UTC')::date BETWEEN ${start}::date AND ${end}::date
        GROUP BY 1, 2
      ),
      issue_created AS (
        SELECT i.creator_id AS user_id,
               (i.created_at_external AT TIME ZONE 'UTC')::date AS metric_date,
               COUNT(*)::int AS issues_created
        FROM tbl_issue i
        WHERE i.organization_id = ${organizationId}::uuid
          AND i.creator_id IS NOT NULL
          AND (i.created_at_external AT TIME ZONE 'UTC')::date BETWEEN ${start}::date AND ${end}::date
        GROUP BY 1, 2
      ),
      issue_resolved AS (
        SELECT COALESCE(i.assignee_id, i.creator_id) AS user_id,
               (i.closed_at AT TIME ZONE 'UTC')::date AS metric_date,
               COUNT(*)::int AS issues_resolved
        FROM tbl_issue i
        WHERE i.organization_id = ${organizationId}::uuid
          AND i.status = 'CLOSED'
          AND i.closed_at IS NOT NULL
          AND COALESCE(i.assignee_id, i.creator_id) IS NOT NULL
          AND (i.closed_at AT TIME ZONE 'UTC')::date BETWEEN ${start}::date AND ${end}::date
        GROUP BY 1, 2
      ),
      build_stats AS (
        SELECT c.author_id AS user_id,
               (p.created_at AT TIME ZONE 'UTC')::date AS metric_date,
               COUNT(*)::int AS builds,
               COUNT(*) FILTER (WHERE p.status = 'SUCCESS')::int AS successful_builds,
               COUNT(*) FILTER (WHERE p.status = 'FAILED')::int AS failed_builds
        FROM tbl_ci_pipeline p
        JOIN tbl_commit c
          ON c.repository_id = p.repository_id
         AND c.commit_hash = p.commit_hash
         AND c.author_id IS NOT NULL
         AND c.is_bot = false
        WHERE p.organization_id = ${organizationId}::uuid
          AND (p.created_at AT TIME ZONE 'UTC')::date BETWEEN ${start}::date AND ${end}::date
        GROUP BY 1, 2
      ),
      grid AS (
        SELECT user_id, metric_date FROM commit_stats
        UNION SELECT user_id, metric_date FROM file_stats
        UNION SELECT user_id, metric_date FROM pr_created
        UNION SELECT user_id, metric_date FROM pr_merged
        UNION SELECT user_id, metric_date FROM review_stats
        UNION SELECT user_id, metric_date FROM issue_created
        UNION SELECT user_id, metric_date FROM issue_resolved
        UNION SELECT user_id, metric_date FROM build_stats
      )
      INSERT INTO tbl_developer_daily_metric (
        id, organization_id, user_id, metric_date,
        commits, prs_created, prs_merged, prs_reviewed, reviews_given,
        issues_created, issues_resolved,
        loc_added, loc_removed, files_changed,
        tests_added, tests_changed, docs_changed,
        builds, successful_builds, failed_builds,
        created_at, updated_at
      )
      SELECT gen_random_uuid(), ${organizationId}::uuid, g.user_id, g.metric_date,
             COALESCE(cs.commits, 0), COALESCE(pc.prs_created, 0), COALESCE(pm.prs_merged, 0),
             COALESCE(rs.prs_reviewed, 0), COALESCE(rs.reviews_given, 0),
             COALESCE(ic.issues_created, 0), COALESCE(ir.issues_resolved, 0),
             COALESCE(cs.loc_added, 0), COALESCE(cs.loc_removed, 0), COALESCE(cs.files_changed, 0),
             COALESCE(fs.tests_added, 0), COALESCE(fs.tests_changed, 0), COALESCE(fs.docs_changed, 0),
             COALESCE(bs.builds, 0), COALESCE(bs.successful_builds, 0), COALESCE(bs.failed_builds, 0),
             NOW(), NOW()
      FROM grid g
      LEFT JOIN commit_stats  cs ON cs.user_id = g.user_id AND cs.metric_date = g.metric_date
      LEFT JOIN file_stats    fs ON fs.user_id = g.user_id AND fs.metric_date = g.metric_date
      LEFT JOIN pr_created    pc ON pc.user_id = g.user_id AND pc.metric_date = g.metric_date
      LEFT JOIN pr_merged     pm ON pm.user_id = g.user_id AND pm.metric_date = g.metric_date
      LEFT JOIN review_stats  rs ON rs.user_id = g.user_id AND rs.metric_date = g.metric_date
      LEFT JOIN issue_created ic ON ic.user_id = g.user_id AND ic.metric_date = g.metric_date
      LEFT JOIN issue_resolved ir ON ir.user_id = g.user_id AND ir.metric_date = g.metric_date
      LEFT JOIN build_stats   bs ON bs.user_id = g.user_id AND bs.metric_date = g.metric_date
      ON CONFLICT (user_id, metric_date) DO UPDATE SET
        commits = EXCLUDED.commits,
        prs_created = EXCLUDED.prs_created,
        prs_merged = EXCLUDED.prs_merged,
        prs_reviewed = EXCLUDED.prs_reviewed,
        reviews_given = EXCLUDED.reviews_given,
        issues_created = EXCLUDED.issues_created,
        issues_resolved = EXCLUDED.issues_resolved,
        loc_added = EXCLUDED.loc_added,
        loc_removed = EXCLUDED.loc_removed,
        files_changed = EXCLUDED.files_changed,
        tests_added = EXCLUDED.tests_added,
        tests_changed = EXCLUDED.tests_changed,
        docs_changed = EXCLUDED.docs_changed,
        builds = EXCLUDED.builds,
        successful_builds = EXCLUDED.successful_builds,
        failed_builds = EXCLUDED.failed_builds,
        updated_at = NOW()
    `;
  }

  /**
   * Team metrics roll up their members' measured evidence. This is deliberately
   * not an average of member ranks — one strong developer must not be able to
   * mask a weak team (docs/devlytics.md §5.2).
   */
  private async rebuildTeamMetrics(window: AggregationWindow): Promise<number> {
    const { organizationId, start, end } = window;

    return this.prisma.$executeRaw`
      WITH member_metrics AS (
        SELECT tm.team_id,
               d.metric_date,
               COUNT(DISTINCT d.user_id)::int AS active_developers,
               COALESCE(SUM(d.commits), 0)::int AS commits,
               COALESCE(SUM(d.prs_created), 0)::int AS prs_created,
               COALESCE(SUM(d.prs_merged), 0)::int AS prs_merged,
               COALESCE(SUM(d.reviews_given), 0)::int AS reviews_given,
               COALESCE(SUM(d.issues_resolved), 0)::int AS issues_resolved,
               COALESCE(SUM(d.loc_added), 0)::int AS loc_added,
               COALESCE(SUM(d.loc_removed), 0)::int AS loc_removed,
               COALESCE(SUM(d.builds), 0)::int AS builds,
               COALESCE(SUM(d.successful_builds), 0)::int AS successful_builds,
               COALESCE(SUM(d.failed_builds), 0)::int AS failed_builds
        FROM tbl_developer_daily_metric d
        JOIN tbl_team_member tm
          ON tm.user_id = d.user_id
         AND tm.organization_id = d.organization_id
        WHERE d.organization_id = ${organizationId}::uuid
          AND d.metric_date BETWEEN ${start}::date AND ${end}::date
        GROUP BY 1, 2
      )
      INSERT INTO tbl_team_daily_metric (
        id, organization_id, team_id, metric_date,
        active_developers, commits, prs_created, prs_merged, reviews_given, issues_resolved,
        loc_added, loc_removed, builds, successful_builds, failed_builds,
        created_at, updated_at
      )
      SELECT gen_random_uuid(), ${organizationId}::uuid, m.team_id, m.metric_date,
             m.active_developers, m.commits, m.prs_created, m.prs_merged, m.reviews_given,
             m.issues_resolved, m.loc_added, m.loc_removed, m.builds, m.successful_builds,
             m.failed_builds, NOW(), NOW()
      FROM member_metrics m
      ON CONFLICT (team_id, metric_date) DO UPDATE SET
        active_developers = EXCLUDED.active_developers,
        commits = EXCLUDED.commits,
        prs_created = EXCLUDED.prs_created,
        prs_merged = EXCLUDED.prs_merged,
        reviews_given = EXCLUDED.reviews_given,
        issues_resolved = EXCLUDED.issues_resolved,
        loc_added = EXCLUDED.loc_added,
        loc_removed = EXCLUDED.loc_removed,
        builds = EXCLUDED.builds,
        successful_builds = EXCLUDED.successful_builds,
        failed_builds = EXCLUDED.failed_builds,
        updated_at = NOW()
    `;
  }

  /** Summed raw metrics for one developer over a period. */
  async developerTotals(
    organizationId: string,
    userId: string,
    start: Date,
    end: Date,
  ) {
    const [totals] = await this.prisma.developerDailyMetric.groupBy({
      by: ['userId'],
      where: { organizationId, userId, metricDate: { gte: start, lte: end } },
      _sum: METRIC_SUMS,
      _count: { _all: true },
    });
    return normalizeTotals(totals?._sum, totals?._count._all ?? 0);
  }

  /** Summed raw metrics for a set of developers, keyed by user id. */
  async developerTotalsBulk(
    organizationId: string,
    userIds: string[],
    start: Date,
    end: Date,
  ): Promise<Map<string, MetricTotals>> {
    const result = new Map<string, MetricTotals>();
    if (userIds.length === 0) return result;

    const rows = await this.prisma.developerDailyMetric.groupBy({
      by: ['userId'],
      where: {
        organizationId,
        userId: { in: userIds },
        metricDate: { gte: start, lte: end },
      },
      _sum: METRIC_SUMS,
      _count: { _all: true },
    });

    for (const row of rows) {
      result.set(row.userId, normalizeTotals(row._sum, row._count._all));
    }
    return result;
  }

  async teamTotals(
    organizationId: string,
    teamId: string,
    start: Date,
    end: Date,
  ) {
    const [totals] = await this.prisma.teamDailyMetric.groupBy({
      by: ['teamId'],
      where: { organizationId, teamId, metricDate: { gte: start, lte: end } },
      _sum: {
        commits: true,
        prsCreated: true,
        prsMerged: true,
        reviewsGiven: true,
        issuesResolved: true,
        locAdded: true,
        locRemoved: true,
        builds: true,
        successfulBuilds: true,
        failedBuilds: true,
      },
      _max: { activeDevelopers: true },
    });

    return {
      commits: totals?._sum.commits ?? 0,
      prsCreated: totals?._sum.prsCreated ?? 0,
      prsMerged: totals?._sum.prsMerged ?? 0,
      reviewsGiven: totals?._sum.reviewsGiven ?? 0,
      issuesResolved: totals?._sum.issuesResolved ?? 0,
      locAdded: totals?._sum.locAdded ?? 0,
      locRemoved: totals?._sum.locRemoved ?? 0,
      builds: totals?._sum.builds ?? 0,
      successfulBuilds: totals?._sum.successfulBuilds ?? 0,
      failedBuilds: totals?._sum.failedBuilds ?? 0,
      peakActiveDevelopers: totals?._max.activeDevelopers ?? 0,
    };
  }
}

const METRIC_SUMS = {
  commits: true,
  prsCreated: true,
  prsMerged: true,
  prsReviewed: true,
  reviewsGiven: true,
  issuesCreated: true,
  issuesResolved: true,
  locAdded: true,
  locRemoved: true,
  filesChanged: true,
  testsAdded: true,
  testsChanged: true,
  docsChanged: true,
  builds: true,
  successfulBuilds: true,
  failedBuilds: true,
} satisfies Prisma.DeveloperDailyMetricSumAggregateInputType;

export interface MetricTotals {
  commits: number;
  prsCreated: number;
  prsMerged: number;
  prsReviewed: number;
  reviewsGiven: number;
  issuesCreated: number;
  issuesResolved: number;
  locAdded: number;
  locRemoved: number;
  filesChanged: number;
  testsAdded: number;
  testsChanged: number;
  docsChanged: number;
  builds: number;
  successfulBuilds: number;
  failedBuilds: number;
  activeDays: number;
}

function normalizeTotals(
  sums: Partial<Record<keyof MetricTotals, number | null>> | undefined,
  activeDays: number,
): MetricTotals {
  return {
    commits: sums?.commits ?? 0,
    prsCreated: sums?.prsCreated ?? 0,
    prsMerged: sums?.prsMerged ?? 0,
    prsReviewed: sums?.prsReviewed ?? 0,
    reviewsGiven: sums?.reviewsGiven ?? 0,
    issuesCreated: sums?.issuesCreated ?? 0,
    issuesResolved: sums?.issuesResolved ?? 0,
    locAdded: sums?.locAdded ?? 0,
    locRemoved: sums?.locRemoved ?? 0,
    filesChanged: sums?.filesChanged ?? 0,
    testsAdded: sums?.testsAdded ?? 0,
    testsChanged: sums?.testsChanged ?? 0,
    docsChanged: sums?.docsChanged ?? 0,
    builds: sums?.builds ?? 0,
    successfulBuilds: sums?.successfulBuilds ?? 0,
    failedBuilds: sums?.failedBuilds ?? 0,
    activeDays,
  };
}

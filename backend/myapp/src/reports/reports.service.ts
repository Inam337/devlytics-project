import { Injectable } from '@nestjs/common';
import { NumberUtil } from '../common/utils/number.util';
import { PeriodUtil } from '../common/utils/period.util';
import { QueryUtil } from '../common/utils/query.util';
import { PrismaService } from '../database/prisma.service';
import { MetricsAggregationService } from '../metrics/metrics-aggregation.service';
import { AppException } from '../common/exceptions/app.exception';
import { ReportQueryDto } from './dto/report-query.dto';
import {
  ReportColumn,
  ReportSection,
  toCsv,
  toNarrativeCsv,
  toNarrativePdf,
  toPdf,
} from './report-export.util';

export interface ReportResult {
  format: 'json' | 'csv' | 'pdf';
  title: string;
  scope: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  sections?: ReportSection[];
  /** The AiAnalysisRun this report snapshots, per devlytics.md §7. */
  analysisRunNumber?: number;
  buffer?: Buffer;
}

/**
 * Read-only report builders. Every report is a snapshot of already-computed
 * data (developer/team scores, quality snapshots, rankings, recommendations)
 * for the requested scope and range — nothing here recomputes a score.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsAggregationService,
  ) {}

  async developers(
    organizationId: string,
    query: ReportQueryDto,
  ): Promise<ReportResult> {
    const { start, end } = PeriodUtil.range(query.from, query.to);
    const scores = await this.prisma.developerScore.findMany({
      where: {
        organizationId,
        periodStart: { gte: start },
        periodEnd: { lte: end },
        ...(query.teamId
          ? { user: { teamMemberships: { some: { teamId: query.teamId } } } }
          : {}),
      },
      orderBy: { totalScore: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    const columns: ReportColumn[] = [
      { key: 'developer', header: 'Developer' },
      { key: 'email', header: 'Email' },
      { key: 'totalScore', header: 'Total Score' },
      { key: 'codeQuality', header: 'Code Quality' },
      { key: 'delivery', header: 'Delivery' },
      { key: 'codeReview', header: 'Code Review' },
      { key: 'testing', header: 'Testing' },
      { key: 'reliability', header: 'Reliability' },
      { key: 'period', header: 'Period' },
    ];

    const rows = scores.map((score) => ({
      developer: `${score.user.firstName} ${score.user.lastName}`,
      email: score.user.email,
      totalScore: NumberUtil.toNumber(score.totalScore),
      codeQuality: NumberUtil.toNumber(score.codeQualityScore),
      delivery: NumberUtil.toNumber(score.deliveryScore),
      codeReview: NumberUtil.toNumber(score.codeReviewScore),
      testing: NumberUtil.toNumber(score.testingScore),
      reliability: NumberUtil.toNumber(score.reliabilityScore),
      period: `${score.period} (${PeriodUtil.toDateOnly(score.periodStart)})`,
    }));

    return this.build('Developer Performance Report', query, columns, rows);
  }

  async teams(
    organizationId: string,
    query: ReportQueryDto,
  ): Promise<ReportResult> {
    const { start, end } = PeriodUtil.range(query.from, query.to);
    const scores = await this.prisma.teamScore.findMany({
      where: {
        organizationId,
        periodStart: { gte: start },
        periodEnd: { lte: end },
        ...QueryUtil.compact({ teamId: query.teamId }),
      },
      orderBy: { totalScore: 'desc' },
      include: { team: { select: { name: true, code: true } } },
    });

    const columns: ReportColumn[] = [
      { key: 'team', header: 'Team' },
      { key: 'code', header: 'Code' },
      { key: 'totalScore', header: 'Total Score' },
      { key: 'memberCount', header: 'Members' },
      { key: 'codeQuality', header: 'Code Quality' },
      { key: 'testing', header: 'Testing' },
      { key: 'period', header: 'Period' },
    ];

    const rows = scores.map((score) => ({
      team: score.team.name,
      code: score.team.code,
      totalScore: NumberUtil.toNumber(score.totalScore),
      memberCount: score.memberCount,
      codeQuality: NumberUtil.toNumber(score.codeQualityScore),
      testing: NumberUtil.toNumber(score.testingScore),
      period: `${score.period} (${PeriodUtil.toDateOnly(score.periodStart)})`,
    }));

    return this.build('Team Performance Report', query, columns, rows);
  }

  async repositories(
    organizationId: string,
    query: ReportQueryDto,
  ): Promise<ReportResult> {
    const repositories = await this.prisma.repository.findMany({
      where: {
        organizationId,
        ...QueryUtil.compact({
          projectId: query.projectId,
          teamId: query.teamId,
        }),
      },
      include: {
        _count: { select: { commits: true, pullRequests: true } },
      },
    });

    const snapshots = await this.prisma.codeQualitySnapshot.findMany({
      where: {
        organizationId,
        repositoryId: { in: repositories.map((r) => r.id) },
      },
      orderBy: { snapshotDate: 'desc' },
    });
    const latest = new Map<string, (typeof snapshots)[number]>();
    for (const snapshot of snapshots) {
      if (!latest.has(snapshot.repositoryId))
        latest.set(snapshot.repositoryId, snapshot);
    }

    const columns: ReportColumn[] = [
      { key: 'name', header: 'Repository' },
      { key: 'commits', header: 'Commits' },
      { key: 'pullRequests', header: 'Pull Requests' },
      { key: 'qualityScore', header: 'Quality Score' },
      { key: 'coveragePercent', header: 'Coverage %' },
      { key: 'syncStatus', header: 'Sync Status' },
    ];

    const rows = repositories.map((repo) => {
      const snap = latest.get(repo.id);
      return {
        name: repo.fullName,
        commits: repo._count.commits,
        pullRequests: repo._count.pullRequests,
        qualityScore: snap ? NumberUtil.toNumber(snap.qualityScore) : null,
        coveragePercent: snap
          ? NumberUtil.toNumber(snap.coveragePercent)
          : null,
        syncStatus: repo.syncStatus,
      };
    });

    return this.build('Repository Performance Report', query, columns, rows);
  }

  async quality(
    organizationId: string,
    query: ReportQueryDto,
  ): Promise<ReportResult> {
    const { start, end } = PeriodUtil.range(query.from, query.to);
    const snapshots = await this.prisma.codeQualitySnapshot.findMany({
      where: {
        organizationId,
        snapshotDate: { gte: start, lte: end },
        ...QueryUtil.compact({
          repositoryId: query.repositoryId,
          projectId: query.projectId,
        }),
      },
      orderBy: { snapshotDate: 'desc' },
      include: { repository: { select: { fullName: true } } },
    });

    const columns: ReportColumn[] = [
      { key: 'repository', header: 'Repository' },
      { key: 'date', header: 'Date' },
      { key: 'qualityScore', header: 'Quality Score' },
      { key: 'bugs', header: 'Bugs' },
      { key: 'codeSmells', header: 'Code Smells' },
      { key: 'coveragePercent', header: 'Coverage %' },
      { key: 'duplicationPercent', header: 'Duplication %' },
    ];

    const rows = snapshots.map((snapshot) => ({
      repository: snapshot.repository.fullName,
      date: PeriodUtil.toDateOnly(snapshot.snapshotDate),
      qualityScore: NumberUtil.toNumber(snapshot.qualityScore),
      bugs: snapshot.bugs,
      codeSmells: snapshot.codeSmells,
      coveragePercent: NumberUtil.toNumber(snapshot.coveragePercent),
      duplicationPercent: NumberUtil.toNumber(snapshot.duplicationPercent),
    }));

    return this.build('Code Quality Report', query, columns, rows);
  }

  async rankings(
    organizationId: string,
    query: ReportQueryDto,
  ): Promise<ReportResult> {
    const history = await this.prisma.rankingHistory.findMany({
      where: {
        organizationId,
        ...QueryUtil.compact({ teamId: query.teamId }),
      },
      orderBy: { periodStart: 'desc' },
      take: 200,
      include: {
        user: { select: { firstName: true, lastName: true } },
        team: { select: { name: true } },
      },
    });

    const columns: ReportColumn[] = [
      { key: 'subject', header: 'Subject' },
      { key: 'subjectType', header: 'Type' },
      { key: 'rank', header: 'Rank' },
      { key: 'rankDelta', header: 'Change' },
      { key: 'score', header: 'Score' },
      { key: 'period', header: 'Period' },
    ];

    const rows = history.map((row) => ({
      subject: row.user
        ? `${row.user.firstName} ${row.user.lastName}`
        : (row.team?.name ?? ''),
      subjectType: row.subjectType,
      rank: row.rank,
      rankDelta: row.rankDelta,
      score: NumberUtil.toNumber(row.score),
      period: `${row.period} (${PeriodUtil.toDateOnly(row.periodStart)})`,
    }));

    return this.build('Rankings Report', query, columns, rows);
  }

  /**
   * Individual AI-analysis report (devlytics.md §7): measured evidence, AI
   * interpretation of findings on repos the developer contributed to, their
   * raw contribution totals, and a strengths/growth-area/confidence summary.
   * Never call this for a peer developer — the controller enforces that only
   * the developer themselves, their team lead, or an org admin may request it.
   */
  async individualAiAnalysis(
    organizationId: string,
    userId: string,
    query: ReportQueryDto,
  ): Promise<ReportResult> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, memberships: { some: { organizationId } } },
      select: { firstName: true, lastName: true },
    });
    if (!user) throw AppException.notFound('Developer', userId);

    const { start, end } = PeriodUtil.range(query.from, query.to);
    const score = await this.prisma.developerScore.findFirst({
      where: { organizationId, userId },
      orderBy: { computedAt: 'desc' },
    });
    const totals = await this.metrics.developerTotals(
      organizationId,
      userId,
      start,
      end,
    );

    const repoIds = (
      await this.prisma.repositoryMember.findMany({
        where: { organizationId, userId },
        select: { repositoryId: true },
      })
    ).map((r) => r.repositoryId);

    const issues = await this.prisma.codeQualityIssue.findMany({
      where: {
        organizationId,
        repositoryId: { in: repoIds },
        aiInference: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { recommendations: true },
    });

    const categoryScores = score
      ? {
          'Code Quality': NumberUtil.toNumber(score.codeQualityScore),
          Delivery: NumberUtil.toNumber(score.deliveryScore),
          'Code Review': NumberUtil.toNumber(score.codeReviewScore),
          Testing: NumberUtil.toNumber(score.testingScore),
          Reliability: NumberUtil.toNumber(score.reliabilityScore),
          Collaboration: NumberUtil.toNumber(score.collaborationScore),
          Documentation: NumberUtil.toNumber(score.documentationScore),
          'Project Impact': NumberUtil.toNumber(score.projectImpactScore),
        }
      : {};
    const ranked = Object.entries(categoryScores).sort((a, b) => b[1] - a[1]);
    const strength = ranked[0]?.[0] ?? 'n/a';
    const growthArea = ranked[ranked.length - 1]?.[0] ?? 'n/a';
    const confidences = issues.flatMap((issue) =>
      issue.recommendations
        .map((rec) => (rec.aiConfidence ? NumberUtil.toNumber(rec.aiConfidence) : null))
        .filter((value): value is number => value !== null),
    );
    const avgConfidence = NumberUtil.average(confidences);

    const sections: ReportSection[] = [
      {
        heading: 'Measured Evidence',
        paragraphs: score
          ? [
              `Total score ${NumberUtil.toNumber(score.totalScore)} for ${score.period} (${PeriodUtil.toDateOnly(score.periodStart)}), weight version ${score.weightVersion}.`,
            ]
          : ['No computed score exists yet for this developer.'],
        table: {
          columns: [
            { key: 'category', header: 'Category' },
            { key: 'value', header: 'Score' },
          ],
          rows: Object.entries(categoryScores).map(([category, value]) => ({
            category,
            value,
          })),
        },
      },
      {
        heading: 'AI Interpretation',
        paragraphs:
          issues.length === 0
            ? ['No AI-interpreted findings on this developer’s repositories yet.']
            : undefined,
        table: {
          columns: [
            { key: 'title', header: 'Finding' },
            { key: 'observedFact', header: 'Observed Fact' },
            { key: 'aiInference', header: 'AI Inference' },
          ],
          rows: issues.map((issue) => ({
            title: issue.title,
            observedFact: issue.observedFact,
            aiInference: issue.aiInference ?? '',
          })),
        },
      },
      {
        heading: 'Member Contribution',
        table: {
          columns: [
            { key: 'metric', header: 'Metric' },
            { key: 'value', header: 'Value' },
          ],
          rows: [
            { metric: 'Commits', value: totals.commits },
            { metric: 'PRs created', value: totals.prsCreated },
            { metric: 'PRs merged', value: totals.prsMerged },
            { metric: 'Reviews given', value: totals.reviewsGiven },
            { metric: 'Lines added', value: totals.locAdded },
            { metric: 'Lines removed', value: totals.locRemoved },
          ],
        },
      },
      {
        heading: 'Strengths, Growth Area & Recommended Next Quarter',
        paragraphs: [
          `Strongest category: ${strength}.`,
          `Suggested growth area: ${growthArea}.`,
          confidences.length > 0
            ? `Average AI confidence across ${confidences.length} recommendation(s): ${avgConfidence.toFixed(2)}.`
            : 'No AI recommendations with a confidence score yet.',
        ],
      },
    ];

    const latestRunNumber = await this.latestRunNumber(organizationId, repoIds);
    return this.buildNarrative(
      `Individual AI Analysis — ${user.firstName} ${user.lastName}`,
      query,
      sections,
      latestRunNumber,
    );
  }

  /**
   * Team AI-analysis report (devlytics.md §7): team-level measured evidence,
   * AI interpretation of open recommendations across the team's repositories,
   * and each member's contribution.
   */
  async teamAiAnalysis(
    organizationId: string,
    teamId: string,
    query: ReportQueryDto,
  ): Promise<ReportResult> {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, organizationId },
      select: { name: true },
    });
    if (!team) throw AppException.notFound('Team', teamId);

    const teamScore = await this.prisma.teamScore.findFirst({
      where: { organizationId, teamId },
      orderBy: { computedAt: 'desc' },
    });

    const members = await this.prisma.teamMember.findMany({
      where: { organizationId, teamId },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
    const { start, end } = PeriodUtil.range(query.from, query.to);
    const memberTotals = await this.metrics.developerTotalsBulk(
      organizationId,
      members.map((m) => m.userId),
      start,
      end,
    );

    const repoIds = (
      await this.prisma.repository.findMany({
        where: { organizationId, teamId },
        select: { id: true },
      })
    ).map((r) => r.id);

    const recommendations = await this.prisma.improvementRecommendation.findMany({
      where: {
        organizationId,
        qualityIssue: { repositoryId: { in: repoIds } },
        status: { not: 'REJECTED' },
      },
      orderBy: { priority: 'asc' },
      take: 15,
    });

    const sections: ReportSection[] = [
      {
        heading: 'Measured Evidence',
        paragraphs: teamScore
          ? [
              `Team total score ${NumberUtil.toNumber(teamScore.totalScore)} across ${teamScore.memberCount} member(s) for ${teamScore.period} (${PeriodUtil.toDateOnly(teamScore.periodStart)}).`,
            ]
          : ['No computed team score exists yet.'],
      },
      {
        heading: 'AI Interpretation & Recommended Next Quarter',
        paragraphs:
          recommendations.length === 0
            ? ['No open AI recommendations for this team’s repositories.']
            : undefined,
        table: {
          columns: [
            { key: 'title', header: 'Recommendation' },
            { key: 'category', header: 'Category' },
            { key: 'priority', header: 'Priority' },
          ],
          rows: recommendations.map((rec) => ({
            title: rec.title,
            category: rec.category,
            priority: rec.priority,
          })),
        },
      },
      {
        heading: 'Member Contribution',
        table: {
          columns: [
            { key: 'developer', header: 'Developer' },
            { key: 'commits', header: 'Commits' },
            { key: 'prsCreated', header: 'PRs Created' },
            { key: 'reviewsGiven', header: 'Reviews Given' },
          ],
          rows: members.map((member) => {
            const totals = memberTotals.get(member.userId);
            return {
              developer: `${member.user.firstName} ${member.user.lastName}`,
              commits: totals?.commits ?? 0,
              prsCreated: totals?.prsCreated ?? 0,
              reviewsGiven: totals?.reviewsGiven ?? 0,
            };
          }),
        },
      },
    ];

    const latestRunNumber = await this.latestRunNumber(organizationId, repoIds);
    return this.buildNarrative(
      `Team AI Analysis — ${team.name}`,
      query,
      sections,
      latestRunNumber,
    );
  }

  private async latestRunNumber(
    organizationId: string,
    repositoryIds: string[],
  ): Promise<number | undefined> {
    if (repositoryIds.length === 0) return undefined;
    const run = await this.prisma.aiAnalysisRun.findFirst({
      where: { organizationId, repositoryId: { in: repositoryIds } },
      orderBy: { runNumber: 'desc' },
      select: { runNumber: true },
    });
    return run?.runNumber;
  }

  private async buildNarrative(
    title: string,
    query: ReportQueryDto,
    sections: ReportSection[],
    analysisRunNumber: number | undefined,
  ): Promise<ReportResult> {
    const scope = this.scopeLabel(query);
    const format = query.format ?? 'json';

    if (format === 'pdf') {
      return {
        format,
        title,
        scope,
        columns: [],
        rows: [],
        sections,
        analysisRunNumber,
        buffer: await toNarrativePdf(title, scope, sections),
      };
    }
    if (format === 'csv') {
      return {
        format,
        title,
        scope,
        columns: [],
        rows: [],
        sections,
        analysisRunNumber,
        buffer: Buffer.from(toNarrativeCsv(sections), 'utf8'),
      };
    }
    return {
      format,
      title,
      scope,
      columns: [],
      rows: [],
      sections,
      analysisRunNumber,
    };
  }

  async improvements(
    organizationId: string,
    query: ReportQueryDto,
  ): Promise<ReportResult> {
    const recommendations =
      await this.prisma.improvementRecommendation.findMany({
        where: { organizationId },
        orderBy: { priority: 'asc' },
        take: 200,
        include: {
          qualityIssue: {
            select: { title: true, severity: true, repositoryId: true },
          },
        },
      });

    const columns: ReportColumn[] = [
      { key: 'title', header: 'Recommendation' },
      { key: 'category', header: 'Category' },
      { key: 'severity', header: 'Severity' },
      { key: 'status', header: 'Status' },
      { key: 'confidence', header: 'AI Confidence' },
    ];

    const rows = recommendations.map((recommendation) => ({
      title: recommendation.title,
      category: recommendation.category,
      severity: recommendation.qualityIssue?.severity ?? '',
      status: recommendation.status,
      confidence: recommendation.aiConfidence
        ? NumberUtil.toNumber(recommendation.aiConfidence)
        : null,
    }));

    return this.build('Improvements Report', query, columns, rows);
  }

  private scopeLabel(query: ReportQueryDto): string {
    return [
      query.from || query.to
        ? `${query.from ?? '…'} to ${query.to ?? 'today'}`
        : 'all time',
      query.departmentId ? `department ${query.departmentId}` : null,
      query.teamId ? `team ${query.teamId}` : null,
      query.projectId ? `project ${query.projectId}` : null,
      query.repositoryId ? `repository ${query.repositoryId}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  private async build(
    title: string,
    query: ReportQueryDto,
    columns: ReportColumn[],
    rows: Record<string, unknown>[],
  ): Promise<ReportResult> {
    const scope = this.scopeLabel(query);
    const format = query.format ?? 'json';
    if (format === 'pdf') {
      return {
        format,
        title,
        scope,
        columns,
        rows,
        buffer: await toPdf(title, scope, columns, rows),
      };
    }
    if (format === 'csv') {
      return {
        format,
        title,
        scope,
        columns,
        rows,
        buffer: Buffer.from(toCsv(columns, rows), 'utf8'),
      };
    }
    return { format, title, scope, columns, rows };
  }
}

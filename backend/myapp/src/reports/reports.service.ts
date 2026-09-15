import { Injectable } from '@nestjs/common';
import { NumberUtil } from '../common/utils/number.util';
import { PeriodUtil } from '../common/utils/period.util';
import { QueryUtil } from '../common/utils/query.util';
import { PrismaService } from '../database/prisma.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportColumn, toCsv, toPdf } from './report-export.util';

export interface ReportResult {
  format: 'json' | 'csv' | 'pdf';
  title: string;
  scope: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  buffer?: Buffer;
}

/**
 * Read-only report builders. Every report is a snapshot of already-computed
 * data (developer/team scores, quality snapshots, rankings, recommendations)
 * for the requested scope and range — nothing here recomputes a score.
 */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async developers(organizationId: string, query: ReportQueryDto): Promise<ReportResult> {
    const { start, end } = PeriodUtil.range(query.from, query.to);
    const scores = await this.prisma.developerScore.findMany({
      where: {
        organizationId,
        periodStart: { gte: start },
        periodEnd: { lte: end },
        ...(query.teamId ? { user: { teamMemberships: { some: { teamId: query.teamId } } } } : {}),
      },
      orderBy: { totalScore: 'desc' },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
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

  async teams(organizationId: string, query: ReportQueryDto): Promise<ReportResult> {
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

  async repositories(organizationId: string, query: ReportQueryDto): Promise<ReportResult> {
    const repositories = await this.prisma.repository.findMany({
      where: {
        organizationId,
        ...QueryUtil.compact({ projectId: query.projectId, teamId: query.teamId }),
      },
      include: {
        _count: { select: { commits: true, pullRequests: true } },
      },
    });

    const snapshots = await this.prisma.codeQualitySnapshot.findMany({
      where: { organizationId, repositoryId: { in: repositories.map((r) => r.id) } },
      orderBy: { snapshotDate: 'desc' },
    });
    const latest = new Map<string, (typeof snapshots)[number]>();
    for (const snapshot of snapshots) {
      if (!latest.has(snapshot.repositoryId)) latest.set(snapshot.repositoryId, snapshot);
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
        coveragePercent: snap ? NumberUtil.toNumber(snap.coveragePercent) : null,
        syncStatus: repo.syncStatus,
      };
    });

    return this.build('Repository Performance Report', query, columns, rows);
  }

  async quality(organizationId: string, query: ReportQueryDto): Promise<ReportResult> {
    const { start, end } = PeriodUtil.range(query.from, query.to);
    const snapshots = await this.prisma.codeQualitySnapshot.findMany({
      where: {
        organizationId,
        snapshotDate: { gte: start, lte: end },
        ...QueryUtil.compact({ repositoryId: query.repositoryId, projectId: query.projectId }),
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

  async rankings(organizationId: string, query: ReportQueryDto): Promise<ReportResult> {
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
      subject: row.user ? `${row.user.firstName} ${row.user.lastName}` : (row.team?.name ?? ''),
      subjectType: row.subjectType,
      rank: row.rank,
      rankDelta: row.rankDelta,
      score: NumberUtil.toNumber(row.score),
      period: `${row.period} (${PeriodUtil.toDateOnly(row.periodStart)})`,
    }));

    return this.build('Rankings Report', query, columns, rows);
  }

  async improvements(organizationId: string, query: ReportQueryDto): Promise<ReportResult> {
    const recommendations = await this.prisma.improvementRecommendation.findMany({
      where: { organizationId },
      orderBy: { priority: 'asc' },
      take: 200,
      include: { qualityIssue: { select: { title: true, severity: true, repositoryId: true } } },
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
      confidence: recommendation.aiConfidence ? NumberUtil.toNumber(recommendation.aiConfidence) : null,
    }));

    return this.build('Improvements Report', query, columns, rows);
  }

  private async build(
    title: string,
    query: ReportQueryDto,
    columns: ReportColumn[],
    rows: Record<string, unknown>[],
  ): Promise<ReportResult> {
    const scope = [
      query.from || query.to ? `${query.from ?? '…'} to ${query.to ?? 'today'}` : 'all time',
      query.departmentId ? `department ${query.departmentId}` : null,
      query.teamId ? `team ${query.teamId}` : null,
      query.projectId ? `project ${query.projectId}` : null,
      query.repositoryId ? `repository ${query.repositoryId}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    const format = query.format ?? 'json';
    if (format === 'pdf') {
      return { format, title, scope, columns, rows, buffer: await toPdf(title, scope, columns, rows) };
    }
    if (format === 'csv') {
      return { format, title, scope, columns, rows, buffer: Buffer.from(toCsv(columns, rows), 'utf8') };
    }
    return { format, title, scope, columns, rows };
  }
}

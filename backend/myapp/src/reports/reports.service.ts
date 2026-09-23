import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, ReportExport, RoleKey } from '@prisma/client';
import { Queue } from 'bullmq';
import {
  PaginatedResult,
  PaginationQueryDto,
} from '../common/dto/pagination.dto';
import {
  individualAiReportMail,
  teamAiReportMail,
} from '../common/mail-templates/digest-milestone-alert.templates';
import { MailService } from '../common/services/mail.service';
import { NumberUtil } from '../common/utils/number.util';
import { PeriodUtil } from '../common/utils/period.util';
import { QueryUtil } from '../common/utils/query.util';
import { PrismaService } from '../database/prisma.service';
import { MetricsAggregationService } from '../metrics/metrics-aggregation.service';
import { AppException } from '../common/exceptions/app.exception';
import { QUEUE } from '../queue/queue.constants';
import { safeEnqueue } from '../queue/queue.util';
import { CreateReportExportDto } from './dto/create-report-export.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import {
  ReportColumn,
  ReportSection,
  toCsv,
  toNarrativeCsv,
  toNarrativePdf,
  toPdf,
} from './report-export.util';

/** The subset of the authenticated caller an export access check needs. */
export interface ExportActor {
  userId: string;
  roleKey: RoleKey;
}

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
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsAggregationService,
    @InjectQueue(QUEUE.REPORT_GENERATION)
    private readonly reportQueue: Queue,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  private appUrl(): string {
    return this.config.get<string>('app.url', 'http://localhost:3000');
  }

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
        .map((rec) =>
          rec.aiConfidence ? NumberUtil.toNumber(rec.aiConfidence) : null,
        )
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
            ? [
                'No AI-interpreted findings on this developer’s repositories yet.',
              ]
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
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
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

    const recommendations =
      await this.prisma.improvementRecommendation.findMany({
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

  // ---------------------------------------------------------------------
  // Async exports (WOR-7): the six report builders above stream a buffer
  // synchronously for live preview; these queue the same builders onto
  // `report-generation` and persist the result as a downloadable
  // `ReportExport` row, per devlytics.md §7.
  // ---------------------------------------------------------------------

  /** Queues an export job; the buffer is produced by `generateExport` on the worker. */
  async requestExport(
    organizationId: string,
    dto: CreateReportExportDto,
    actor: ExportActor,
  ): Promise<{ id: string; status: string; queued: boolean }> {
    if (dto.reportType === 'INDIVIDUAL_AI_ANALYSIS') {
      if (!dto.targetUserId) {
        throw AppException.badRequest(
          'targetUserId is required for an INDIVIDUAL_AI_ANALYSIS export',
        );
      }
      await this.assertIndividualTargetAccess(
        organizationId,
        dto.targetUserId,
        actor,
      );
    }

    const { reportType, format, targetUserId, ...filters } = dto;
    const record = await this.prisma.reportExport.create({
      data: {
        organizationId,
        requestedById: actor.userId,
        targetUserId,
        reportType,
        format,
        filters: QueryUtil.compact(
          filters as Record<string, unknown>,
        ) as Prisma.InputJsonValue,
      },
    });

    const queued = await safeEnqueue(
      this.reportQueue,
      'generate-export',
      { organizationId, requestedBy: actor.userId, exportId: record.id },
      this.logger,
      { jobId: record.id },
    );

    return { id: record.id, status: record.status, queued };
  }

  async listExports(
    organizationId: string,
    requestedById: string,
    query: PaginationQueryDto,
  ) {
    const where: Prisma.ReportExportWhereInput = {
      organizationId,
      requestedById,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.reportExport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
        select: {
          id: true,
          reportType: true,
          format: true,
          status: true,
          fileName: true,
          targetUserId: true,
          analysisRunNumber: true,
          errorMessage: true,
          createdAt: true,
          finishedAt: true,
        },
      }),
      this.prisma.reportExport.count({ where }),
    ]);
    return PaginatedResult.from(items, total, query);
  }

  async getExportStatus(
    organizationId: string,
    id: string,
    actor: ExportActor,
  ) {
    const record = await this.findExportOrThrow(organizationId, id);
    await this.assertExportAccess(organizationId, record, actor);
    return {
      id: record.id,
      reportType: record.reportType,
      format: record.format,
      status: record.status,
      fileName: record.fileName,
      analysisRunNumber: record.analysisRunNumber,
      errorMessage: record.errorMessage,
      createdAt: record.createdAt,
      finishedAt: record.finishedAt,
    };
  }

  async downloadExport(
    organizationId: string,
    id: string,
    actor: ExportActor,
  ): Promise<{ fileName: string; mimeType: string; buffer: Buffer }> {
    const record = await this.findExportOrThrow(organizationId, id);
    await this.assertExportAccess(organizationId, record, actor);

    if (record.status !== 'COMPLETED' || !record.fileBytes) {
      throw AppException.unprocessable(
        `Report export is ${record.status.toLowerCase()}, not ready for download`,
      );
    }

    return {
      fileName: record.fileName ?? 'report',
      mimeType: record.mimeType ?? 'application/octet-stream',
      buffer: Buffer.from(record.fileBytes),
    };
  }

  /**
   * Builds the export and persists it — called from `ReportGenerationProcessor`.
   * Mirrors `AiAnalysisService#runInterpretation`: COMPLETED/FAILED is decided
   * here, the processor only rethrows so BullMQ's retry/backoff takes over.
   */
  async generateExport(
    organizationId: string,
    exportId: string,
  ): Promise<void> {
    const record = await this.findExportOrThrow(organizationId, exportId);

    await this.prisma.reportExport.update({
      where: { id: exportId },
      data: { status: 'RUNNING' },
    });

    try {
      const result = await this.buildForExport(organizationId, record);
      const fileName = `${slug(result.title)}.${record.format.toLowerCase()}`;
      await this.prisma.reportExport.update({
        where: { id: exportId },
        data: {
          status: 'COMPLETED',
          fileName,
          mimeType:
            record.format === 'PDF'
              ? 'application/pdf'
              : 'text/csv; charset=utf-8',
          fileBytes: result.buffer ? Uint8Array.from(result.buffer) : null,
          analysisRunNumber: result.analysisRunNumber,
          finishedAt: new Date(),
        },
      });

      if (
        record.format === 'PDF' &&
        result.buffer &&
        (record.reportType === 'TEAM_AI_ANALYSIS' ||
          record.reportType === 'INDIVIDUAL_AI_ANALYSIS')
      ) {
        await this.sendAiReportMail(organizationId, record, result, fileName);
      }
    } catch (error) {
      await this.prisma.reportExport.update({
        where: { id: exportId },
        data: {
          status: 'FAILED',
          errorMessage: (error as Error).message.slice(0, 1000),
          finishedAt: new Date(),
        },
      });
      throw error;
    }
  }

  /**
   * WOR-15: the two AI-analysis report emails, PDF attached. Never call this
   * for anything but a completed PDF TEAM_AI_ANALYSIS/INDIVIDUAL_AI_ANALYSIS
   * export — `generateExport` already gates on that.
   *
   * INDIVIDUAL_AI_ANALYSIS is the access-boundary-sensitive case
   * (devlytics.md §7): it goes to the target developer and, if one exists,
   * their team lead — and to no one else, mirroring
   * `assertIndividualTargetAccess`'s notion of "who may see this report".
   */
  private async sendAiReportMail(
    organizationId: string,
    record: ReportExport,
    result: ReportResult,
    fileName: string,
  ): Promise<void> {
    const attachment = {
      filename: fileName,
      content: result.buffer as Buffer,
      contentType: 'application/pdf',
    };
    const ctaUrl = `${this.appUrl()}/reports/exports/${record.id}`;

    try {
      if (record.reportType === 'TEAM_AI_ANALYSIS') {
        const filters = (record.filters as Record<string, unknown>) ?? {};
        const teamId = filters.teamId as string | undefined;
        if (!teamId) return;

        const team = await this.prisma.team.findFirst({
          where: { id: teamId, organizationId },
          select: {
            name: true,
            members: {
              select: {
                user: { select: { email: true, firstName: true } },
              },
            },
          },
        });
        if (!team) return;

        for (const member of team.members) {
          const sendResult = await this.mail.sendTemplate(member.user.email, {
            ...teamAiReportMail({
              recipientFirstName: member.user.firstName,
              teamName: team.name,
              analysisRunNumber: result.analysisRunNumber,
              ctaUrl,
            }),
            attachments: [attachment],
          });
          if (!sendResult.success) {
            this.logger.warn(
              `Team AI-report email failed for ${member.user.email} (export ${record.id}): ${sendResult.error}`,
            );
          }
        }
        return;
      }

      if (
        record.reportType === 'INDIVIDUAL_AI_ANALYSIS' &&
        record.targetUserId
      ) {
        const developer = await this.prisma.user.findUnique({
          where: { id: record.targetUserId },
          select: { email: true, firstName: true, lastName: true },
        });
        if (!developer) return;
        const developerName = `${developer.firstName} ${developer.lastName}`;

        const developerResult = await this.mail.sendTemplate(developer.email, {
          ...individualAiReportMail({
            recipientFirstName: developer.firstName,
            developerName,
            forTeamLead: false,
            analysisRunNumber: result.analysisRunNumber,
            ctaUrl,
          }),
          attachments: [attachment],
        });
        if (!developerResult.success) {
          this.logger.warn(
            `Individual AI-report email failed for developer ${record.targetUserId} (export ${record.id}): ${developerResult.error}`,
          );
        }

        // Same "who counts as the target's team lead" query as
        // `assertIndividualTargetAccess` — never any other team member.
        const team = await this.prisma.team.findFirst({
          where: {
            organizationId,
            members: { some: { userId: record.targetUserId } },
            teamLeadId: { not: null },
          },
          select: {
            teamLead: { select: { email: true, firstName: true } },
          },
        });
        if (team?.teamLead) {
          const leadResult = await this.mail.sendTemplate(team.teamLead.email, {
            ...individualAiReportMail({
              recipientFirstName: team.teamLead.firstName,
              developerName,
              forTeamLead: true,
              analysisRunNumber: result.analysisRunNumber,
              ctaUrl,
            }),
            attachments: [attachment],
          });
          if (!leadResult.success) {
            this.logger.warn(
              `Individual AI-report email to team lead failed for developer ${record.targetUserId} (export ${record.id}): ${leadResult.error}`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.warn(
        `Unexpected error sending AI-report email for export ${record.id}: ${(error as Error).message}`,
      );
    }
  }

  private async buildForExport(
    organizationId: string,
    record: ReportExport,
  ): Promise<ReportResult> {
    const filters = (record.filters as Record<string, unknown>) ?? {};
    const query: ReportQueryDto = {
      ...filters,
      format: record.format === 'PDF' ? 'pdf' : 'csv',
    };

    switch (record.reportType) {
      case 'DEVELOPERS':
        return this.developers(organizationId, query);
      case 'TEAMS':
        return this.teams(organizationId, query);
      case 'REPOSITORIES':
        return this.repositories(organizationId, query);
      case 'QUALITY':
        return this.quality(organizationId, query);
      case 'RANKINGS':
        return this.rankings(organizationId, query);
      case 'IMPROVEMENTS':
        return this.improvements(organizationId, query);
      case 'TEAM_AI_ANALYSIS':
        if (!query.teamId) {
          throw AppException.badRequest(
            'teamId is required for a TEAM_AI_ANALYSIS export',
          );
        }
        return this.teamAiAnalysis(organizationId, query.teamId, query);
      case 'INDIVIDUAL_AI_ANALYSIS':
        if (!record.targetUserId) {
          throw AppException.badRequest(
            'targetUserId is required for an INDIVIDUAL_AI_ANALYSIS export',
          );
        }
        return this.individualAiAnalysis(
          organizationId,
          record.targetUserId,
          query,
        );
      default:
        throw AppException.badRequest(
          `Unsupported report export type: ${record.reportType}`,
        );
    }
  }

  private async findExportOrThrow(
    organizationId: string,
    id: string,
  ): Promise<ReportExport> {
    const record = await this.prisma.reportExport.findFirst({
      where: { id, organizationId },
    });
    if (!record) throw AppException.notFound('Report export', id);
    return record;
  }

  /**
   * Only the requester, the target developer, the target's team lead, or an
   * organization admin may view/download an export — required explicitly for
   * INDIVIDUAL_AI_ANALYSIS (devlytics.md §7: never a peer developer), applied
   * to every export type for consistency.
   */
  private async assertExportAccess(
    organizationId: string,
    record: ReportExport,
    actor: ExportActor,
  ): Promise<void> {
    if (record.requestedById === actor.userId) return;
    if (actor.roleKey === 'ORGANIZATION_ADMIN') return;
    if (record.reportType === 'INDIVIDUAL_AI_ANALYSIS' && record.targetUserId) {
      await this.assertIndividualTargetAccess(
        organizationId,
        record.targetUserId,
        actor,
      );
      return;
    }
    throw AppException.forbidden(
      'You do not have access to this report export',
    );
  }

  /** The access-control acceptance criterion for INDIVIDUAL_AI_ANALYSIS exports. */
  private async assertIndividualTargetAccess(
    organizationId: string,
    targetUserId: string,
    actor: ExportActor,
  ): Promise<void> {
    if (targetUserId === actor.userId) return;
    if (actor.roleKey === 'ORGANIZATION_ADMIN') return;

    const isTeamLead = await this.prisma.team.findFirst({
      where: {
        organizationId,
        teamLeadId: actor.userId,
        members: { some: { userId: targetUserId } },
      },
      select: { id: true },
    });
    if (isTeamLead) return;

    throw AppException.forbidden(
      'Only the developer themselves, their team lead, or an organization admin may access this report',
    );
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

function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { NumberUtil } from '../common/utils/number.util';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../database/prisma.service';
import { QUEUE } from '../queue/queue.constants';
import { safeEnqueue } from '../queue/queue.util';
import { evaluateRules, RepositoryEvidence } from './quality-rules';

const LARGE_PR_LINE_THRESHOLD = 400;

export interface AnalysisOutcome {
  runId: string;
  runNumber: number;
  repositoryId: string;
  issuesFound: number;
  qualityScore: number;
}

/**
 * Sync pipeline stage 4 (Analyze) and part of stage 5 (Score).
 *
 * Produces one `tbl_ai_analysis_run` plus its `tbl_code_quality_issue` rows and
 * a `tbl_code_quality_snapshot` from measured evidence only. The AI layer
 * (`AiAnalysisService`) interprets these facts afterwards — it never runs
 * before this deterministic pass exists.
 */
@Injectable()
export class QualityAnalysisService {
  private readonly logger = new Logger(QualityAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(QUEUE.IMPROVEMENT_PROGRESS)
    private readonly improvementProgressQueue: Queue,
  ) {}

  async analyzeRepository(
    organizationId: string,
    repositoryId: string,
    requestedById?: string,
  ): Promise<AnalysisOutcome> {
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, organizationId },
    });
    if (!repository) throw AppException.notFound('Repository', repositoryId);

    const windowDays = 30;
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const evidence = await this.gatherEvidence(
      organizationId,
      repositoryId,
      since,
      windowDays,
    );
    const findings = evaluateRules(evidence);

    const runNumber = await this.nextRunNumber(organizationId);

    const run = await this.prisma.aiAnalysisRun.create({
      data: {
        organizationId,
        repositoryId,
        projectId: repository.projectId,
        requestedById,
        runNumber,
        scope: 'REPOSITORY',
        status: 'RUNNING',
        startedAt: new Date(),
        observedFacts: evidence as unknown as Prisma.InputJsonValue,
      },
    });

    try {
      if (findings.length > 0) {
        await this.prisma.codeQualityIssue.createMany({
          data: findings.map((finding) => ({
            organizationId,
            analysisRunId: run.id,
            repositoryId,
            ruleId: finding.ruleId,
            category: finding.category,
            severity: finding.severity,
            title: finding.title,
            observedFact: finding.observedFact,
            effort: finding.effort,
            impact: finding.impact,
            metricKey: finding.metricKey,
            measuredValue: new Prisma.Decimal(finding.measuredValue),
          })),
        });
      }

      const snapshot = await this.buildSnapshot(
        organizationId,
        repository,
        run.id,
        evidence,
        findings.length,
      );

      await this.prisma.aiAnalysisRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED',
          finishedAt: new Date(),
          durationMs: Date.now() - run.startedAt!.getTime(),
          filesAnalyzed: evidence.filesChanged,
          issuesFound: findings.length,
        },
      });

      this.logger.log(
        `Analysis run #${runNumber} for ${repository.fullName}: ${findings.length} findings, quality score ${snapshot.qualityScore}`,
      );

      // Single trigger point for goal re-evaluation regardless of which
      // entry point ran this analysis (git-sync, a standalone quality scan,
      // or an AI analysis trigger) — avoids evaluating the same snapshot
      // against goals more than once.
      await safeEnqueue(
        this.improvementProgressQueue,
        'evaluate-goals',
        { organizationId, repositoryId, requestedBy: requestedById },
        this.logger,
      );

      return {
        runId: run.id,
        runNumber,
        repositoryId,
        issuesFound: findings.length,
        qualityScore: snapshot.qualityScore,
      };
    } catch (error) {
      // Scores stay on the last successful run — this run is marked failed, not partial.
      await this.prisma.aiAnalysisRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          errorMessage: (error as Error).message.slice(0, 1000),
        },
      });
      throw error;
    }
  }

  private async gatherEvidence(
    organizationId: string,
    repositoryId: string,
    since: Date,
    windowDays: number,
  ): Promise<RepositoryEvidence> {
    const [commitAgg, fileAgg, prAgg, buildAgg] = await Promise.all([
      this.prisma.commit.aggregate({
        where: {
          organizationId,
          repositoryId,
          isBot: false,
          committedAt: { gte: since },
        },
        _count: { _all: true },
        _sum: { changedFiles: true },
      }),
      this.prisma.commitFile.aggregate({
        where: {
          commit: {
            organizationId,
            repositoryId,
            isBot: false,
            committedAt: { gte: since },
          },
        },
        _count: { _all: true },
      }),
      this.prisma.pullRequest.count({
        where: {
          organizationId,
          repositoryId,
          createdAtExternal: { gte: since },
        },
      }),
      this.prisma.ciPipeline.aggregate({
        where: { organizationId, repositoryId, createdAt: { gte: since } },
        _count: { _all: true },
      }),
    ]);

    const [testFileChanges, docFileChanges, failedBuilds, actuallyLargePrs] =
      await Promise.all([
        this.prisma.commitFile.count({
          where: {
            isTestFile: true,
            commit: {
              organizationId,
              repositoryId,
              isBot: false,
              committedAt: { gte: since },
            },
          },
        }),
        this.prisma.commitFile.count({
          where: {
            isDocFile: true,
            commit: {
              organizationId,
              repositoryId,
              isBot: false,
              committedAt: { gte: since },
            },
          },
        }),
        this.prisma.ciPipeline.count({
          where: {
            organizationId,
            repositoryId,
            createdAt: { gte: since },
            status: 'FAILED',
          },
        }),
        this.prisma.pullRequest.count({
          where: {
            organizationId,
            repositoryId,
            createdAtExternal: { gte: since },
            OR: [
              { additions: { gt: LARGE_PR_LINE_THRESHOLD } },
              { deletions: { gt: LARGE_PR_LINE_THRESHOLD } },
            ],
          },
        }),
      ]);

    const commits = commitAgg._count._all;
    const filesChanged = fileAgg._count._all;

    return {
      windowDays,
      commits,
      filesChanged,
      testFileChanges,
      docFileChanges,
      totalPullRequests: prAgg,
      largePullRequests: actuallyLargePrs,
      totalBuilds: buildAgg._count._all,
      failedBuilds,
      avgFilesPerCommit:
        commits > 0
          ? NumberUtil.round((commitAgg._sum.changedFiles ?? 0) / commits)
          : 0,
    };
  }

  private async buildSnapshot(
    organizationId: string,
    repository: { id: string; projectId: string | null },
    analysisRunId: string,
    evidence: RepositoryEvidence,
    issueCount: number,
  ) {
    const testCoverageProxy = evidence.filesChanged
      ? NumberUtil.percent(evidence.testFileChanges, evidence.filesChanged)
      : 0;
    const ciReliability = evidence.totalBuilds
      ? NumberUtil.percent(
          evidence.totalBuilds - evidence.failedBuilds,
          evidence.totalBuilds,
        )
      : 100;
    const codeSmells = issueCount;
    const maintainabilityScore = NumberUtil.clampScore(
      100 - codeSmells * 8 - Math.max(0, 60 - testCoverageProxy) * 0.3,
    );

    const qualityScore = NumberUtil.clampScore(
      testCoverageProxy * 0.35 +
        ciReliability * 0.35 +
        maintainabilityScore * 0.3,
    );

    const totalLoc = await this.prisma.commit.aggregate({
      where: { organizationId, repositoryId: repository.id },
      _sum: { additions: true, deletions: true },
    });

    const snapshot = await this.prisma.codeQualitySnapshot.upsert({
      where: {
        repositoryId_snapshotDate: {
          repositoryId: repository.id,
          snapshotDate: new Date(new Date().toISOString().slice(0, 10)),
        },
      },
      update: {
        analysisRunId,
        qualityScore: new Prisma.Decimal(qualityScore),
        bugs: 0,
        vulnerabilities: 0,
        securityHotspots: 0,
        codeSmells,
        coveragePercent: new Prisma.Decimal(testCoverageProxy),
        // Requires a source-level duplication scanner not available without a
        // repository checkout in this environment — recorded, not invented.
        duplicationPercent: new Prisma.Decimal(0),
        complexity: new Prisma.Decimal(evidence.avgFilesPerCommit),
        maintainabilityScore: new Prisma.Decimal(maintainabilityScore),
        maintainabilityRating: ratingFor(maintainabilityScore),
        technicalDebtMinutes: codeSmells * 20,
        locTotal:
          (totalLoc._sum.additions ?? 0) + (totalLoc._sum.deletions ?? 0),
        metadata: {
          evidence,
          limitations: [
            'coverage_percent and complexity are proxies derived from commit/file activity, not an instrumented test run',
            'duplication_percent requires a source-level scanner and is not measured in this environment',
          ],
        } as unknown as Prisma.InputJsonValue,
      },
      create: {
        organizationId,
        repositoryId: repository.id,
        projectId: repository.projectId,
        analysisRunId,
        snapshotDate: new Date(new Date().toISOString().slice(0, 10)),
        qualityScore: new Prisma.Decimal(qualityScore),
        codeSmells,
        coveragePercent: new Prisma.Decimal(testCoverageProxy),
        duplicationPercent: new Prisma.Decimal(0),
        complexity: new Prisma.Decimal(evidence.avgFilesPerCommit),
        maintainabilityScore: new Prisma.Decimal(maintainabilityScore),
        maintainabilityRating: ratingFor(maintainabilityScore),
        technicalDebtMinutes: codeSmells * 20,
        locTotal:
          (totalLoc._sum.additions ?? 0) + (totalLoc._sum.deletions ?? 0),
        metadata: {
          evidence,
          limitations: [
            'coverage_percent and complexity are proxies derived from commit/file activity, not an instrumented test run',
            'duplication_percent requires a source-level scanner and is not measured in this environment',
          ],
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return { qualityScore, snapshot };
  }

  private async nextRunNumber(organizationId: string): Promise<number> {
    const last = await this.prisma.aiAnalysisRun.findFirst({
      where: { organizationId },
      orderBy: { runNumber: 'desc' },
      select: { runNumber: true },
    });
    return (last?.runNumber ?? 0) + 1;
  }
}

function ratingFor(score: number): 'A' | 'B' | 'C' | 'D' | 'E' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'E';
}

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SyncJobType } from '@prisma/client';
import { AchievementsService } from '../../achievements/achievements.service';
import { GoalsService } from '../../goals/goals.service';
import { ExperimentsService } from '../../improvements/experiments.service';
import { MetricsAggregationService } from '../../metrics/metrics-aggregation.service';
import { PrismaService } from '../../database/prisma.service';
import { QualityAnalysisService } from '../../quality/quality-analysis.service';
import { QUEUE, BaseJobData } from '../../queue/queue.constants';
import { CollectorService } from '../collector.service';
import { SyncService } from '../sync.service';

interface GitSyncJobData extends BaseJobData {
  repositoryId: string;
  syncJobId: string;
}

/**
 * Executes the sync pipeline end to end for one repository: collect activity,
 * rebuild its metrics, run deterministic quality analysis, recompute scores
 * and rankings for the organization, re-evaluate goals and achievements, and
 * refresh active Improvement Engine experiments.
 *
 * This is the one place the whole "CONNECT → SYNC → ANALYZE → SCORE" chain
 * runs, so a manual "sync now" and the twelve-month backfill behave the same.
 */
@Processor(QUEUE.GIT_SYNC)
export class GitSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(GitSyncProcessor.name);

  constructor(
    private readonly collector: CollectorService,
    private readonly sync: SyncService,
    private readonly metrics: MetricsAggregationService,
    private readonly qualityAnalysis: QualityAnalysisService,
    private readonly goals: GoalsService,
    private readonly achievements: AchievementsService,
    private readonly experiments: ExperimentsService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<GitSyncJobData>): Promise<void> {
    const { organizationId, repositoryId, syncJobId, requestedBy } = job.data;
    await this.sync.markRunning(syncJobId);

    try {
      const result = await this.collector.collect(repositoryId, job.name as SyncJobType, async (processed, total) => {
        await this.sync.markProgress(syncJobId, processed, total);
      });

      await this.metrics.rebuildRecent(organizationId);

      const analysis = await this.qualityAnalysis.analyzeRepository(organizationId, repositoryId, requestedBy);
      await this.goals.evaluateForRepository(organizationId, repositoryId);
      await this.experiments.refreshActiveExperimentMetrics(organizationId);

      const contributors = await this.prisma.repositoryMember.findMany({
        where: { organizationId, repositoryId },
        select: { userId: true },
      });
      for (const contributor of contributors) {
        await this.achievements.evaluateForUser(organizationId, contributor.userId);
      }

      await this.sync.markCompleted(syncJobId, result.total);
      this.logger.log(
        `Sync job ${syncJobId} complete: ${result.total} records, quality score ${analysis.qualityScore}`,
      );
    } catch (error) {
      await this.sync.markFailed(syncJobId, (error as Error).message);
      throw error;
    }
  }
}

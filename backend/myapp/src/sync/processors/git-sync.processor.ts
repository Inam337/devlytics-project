import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { SyncJobType } from '@prisma/client';
import { AchievementsService } from '../../achievements/achievements.service';
import { ExperimentsService } from '../../improvements/experiments.service';
import { MetricsAggregationService } from '../../metrics/metrics-aggregation.service';
import { PrismaService } from '../../database/prisma.service';
import { QualityAnalysisService } from '../../quality/quality-analysis.service';
import { QUEUE, BaseJobData } from '../../queue/queue.constants';
import { safeEnqueue } from '../../queue/queue.util';
import { CollectorService } from '../collector.service';
import { SyncService } from '../sync.service';

interface GitSyncJobData extends BaseJobData {
  repositoryId: string;
  syncJobId: string;
}

/**
 * Executes the sync pipeline end to end for one repository: collect activity,
 * rebuild its metrics, run deterministic quality analysis (which itself
 * queues goal re-evaluation — see `QualityAnalysisService#analyzeRepository`),
 * recompute scores and rankings for the organization, evaluate achievements,
 * and refresh active Improvement Engine experiments.
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
    private readonly achievements: AchievementsService,
    private readonly experiments: ExperimentsService,
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE.RANKING_CALCULATION)
    private readonly rankingQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<GitSyncJobData>): Promise<void> {
    const { organizationId, repositoryId, syncJobId, requestedBy } = job.data;
    await this.sync.markRunning(syncJobId);

    try {
      const result = await this.collector.collect(
        repositoryId,
        job.name as SyncJobType,
        async (processed, total) => {
          await this.sync.markProgress(syncJobId, processed, total);
        },
      );

      await this.metrics.rebuildRecent(organizationId);

      const analysis = await this.qualityAnalysis.analyzeRepository(
        organizationId,
        repositoryId,
        requestedBy,
      );
      await this.experiments.refreshActiveExperimentMetrics(organizationId);

      const contributors = await this.prisma.repositoryMember.findMany({
        where: { organizationId, repositoryId },
        select: { userId: true },
      });
      for (const contributor of contributors) {
        await this.achievements.evaluateForUser(
          organizationId,
          contributor.userId,
        );
      }

      // One recompute per org per day even if several repositories sync
      // concurrently — the deterministic jobId makes re-adding a no-op.
      // BullMQ rejects a custom jobId containing ':' (reserved as its own
      // Redis key separator), so this must stay dash-separated — and match
      // SchedulerService#closePeriod's DAILY jobId exactly, so a repo sync
      // and the WOR-12 period-close trigger dedupe against each other
      // instead of computing the same day's ranking twice.
      const today = new Date().toISOString().slice(0, 10);
      await safeEnqueue(
        this.rankingQueue,
        'recompute',
        { organizationId, period: 'DAILY', requestedBy },
        this.logger,
        { jobId: `ranking-calc-${organizationId}-DAILY-${today}` },
      );

      await this.sync.markCompleted(syncJobId, result.total);
      this.logger.log(
        `Sync job ${syncJobId} complete: ${result.total} records, quality score ${analysis.qualityScore}`,
      );
    } catch (error) {
      // BullMQ retries this same job up to `attempts` times (queue.module.ts).
      // Inside process(), job.attemptsMade counts attempts made *before* this
      // one (0 on the first call) — so this call is attempt attemptsMade + 1.
      const maxAttempts = job.opts.attempts ?? 1;
      const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;
      await this.sync.markFailed(
        syncJobId,
        (error as Error).message,
        isFinalAttempt,
      );
      throw error;
    }
  }
}

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobData, QUEUE } from '../../queue/queue.constants';
import { MetricsAggregationService } from '../metrics-aggregation.service';

interface MetricsCalculationJobData extends BaseJobData {
  /** Days to look back; defaults to the same window `rebuildRecent` uses. */
  days?: number;
}

/**
 * Consumes `metrics-calculation` jobs for standalone/on-demand recomputation
 * (e.g. after a bot-classification fix) — idempotent per
 * `(user_id/team_id, metric_date)`, same as `rebuildRecent`.
 *
 * Not on the git-sync critical path: `GitSyncProcessor` still calls
 * `MetricsAggregationService#rebuildRecent` directly and synchronously,
 * because scoring/ranking (enqueued right after, on a *different* queue)
 * reads these tables immediately — routing through this queue too would let
 * the two jobs race across workers with no ordering guarantee between them.
 */
@Processor(QUEUE.METRICS_CALCULATION)
export class MetricsCalculationProcessor extends WorkerHost {
  private readonly logger = new Logger(MetricsCalculationProcessor.name);

  constructor(private readonly metrics: MetricsAggregationService) {
    super();
  }

  async process(job: Job<MetricsCalculationJobData>): Promise<void> {
    const { organizationId, days } = job.data;
    const result = await this.metrics.rebuildRecent(organizationId, days);

    this.logger.log(
      `Metrics recalculated for org ${organizationId}: ` +
        `${result.developerRows} developer row(s), ${result.teamRows} team row(s)`,
    );
  }
}

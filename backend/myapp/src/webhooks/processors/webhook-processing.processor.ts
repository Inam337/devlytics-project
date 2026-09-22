import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AuditService } from '../../audit/audit.service';
import { BaseJobData, QUEUE } from '../../queue/queue.constants';
import { SyncService } from '../../sync/sync.service';

interface WebhookProcessingJobData extends BaseJobData {
  repositoryId: string;
  fullName: string;
  eventKey: string;
}

/**
 * Consumes `webhook-processing` jobs enqueued by `WebhooksService` right
 * after signature verification succeeds (verification itself stays
 * synchronous in the request — it's a handful of fast DB reads + an HMAC
 * compare, not the slow part). This processor does the remaining
 * post-verification bookkeeping: audit the event, then queue the actual
 * incremental sync.
 *
 * It deliberately does not parse commits/PRs/pipelines out of the webhook
 * payload itself — `WebhooksService`'s docstring is explicit that the
 * provider re-fetch via `SyncService#queueIncremental` /
 * `GitSyncProcessor` is "exactly one code path that writes commits/PRs/etc.",
 * so the payload stays a trigger, not a second data source.
 */
@Processor(QUEUE.WEBHOOK_PROCESSING)
export class WebhookProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessingProcessor.name);

  constructor(
    private readonly sync: SyncService,
    private readonly audit: AuditService,
  ) {
    super();
  }

  async process(job: Job<WebhookProcessingJobData>): Promise<void> {
    const { organizationId, repositoryId, fullName, eventKey } = job.data;

    const jobs = await this.sync.queueIncremental(organizationId, [
      repositoryId,
    ]);

    await this.audit.record({
      organizationId,
      category: 'INTEGRATION',
      action: 'webhook.received',
      summary: `Webhook '${eventKey}' received for ${fullName}`,
      entityType: 'Repository',
      entityId: repositoryId,
    });

    this.logger.log(
      `Processed webhook '${eventKey}' for ${fullName}: ${jobs.length} sync job(s) queued`,
    );
  }
}

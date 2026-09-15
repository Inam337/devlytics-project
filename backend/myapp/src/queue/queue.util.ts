import { Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { BaseJobData } from './queue.constants';

/**
 * Enqueues work without letting a Redis outage fail the caller's HTTP request.
 *
 * This implements the documented failure behaviour: when background processing
 * is unavailable the request still records its intent (the caller has already
 * persisted a `tbl_sync_job` row) and the last good values stay in place —
 * nothing is zeroed or extrapolated.
 */
export async function safeEnqueue<T extends BaseJobData>(
  queue: Queue,
  jobName: string,
  data: T,
  logger: Logger,
  options?: { jobId?: string; delay?: number },
): Promise<boolean> {
  try {
    await queue.add(jobName, data, options);
    return true;
  } catch (error) {
    logger.error(
      `Could not enqueue '${jobName}' on '${queue.name}' for organization ${data.organizationId}: ${
        (error as Error).message
      }`,
    );
    return false;
  }
}

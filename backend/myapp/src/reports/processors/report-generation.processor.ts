import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE, BaseJobData } from '../../queue/queue.constants';
import { ReportsService } from '../reports.service';

interface ReportGenerationJobData extends BaseJobData {
  exportId: string;
}

/**
 * Consumes `report-generation` jobs enqueued by `ReportsService#requestExport`.
 *
 * Status transitions (RUNNING → COMPLETED/FAILED) live in
 * `ReportsService#generateExport`, not here — mirrors `AiAnalysisProcessor`.
 * This processor only rethrows on an unexpected error so BullMQ's
 * retry/backoff (queue.module.ts) takes over.
 */
@Processor(QUEUE.REPORT_GENERATION)
export class ReportGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportGenerationProcessor.name);

  constructor(private readonly reports: ReportsService) {
    super();
  }

  async process(job: Job<ReportGenerationJobData>): Promise<void> {
    const { organizationId, exportId } = job.data;

    await this.reports.generateExport(organizationId, exportId);

    this.logger.log(
      `Report export ${exportId} generated for organization ${organizationId}`,
    );
  }
}

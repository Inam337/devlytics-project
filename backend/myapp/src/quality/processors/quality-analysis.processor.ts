import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE, BaseJobData } from '../../queue/queue.constants';
import { QualityAnalysisService } from '../quality-analysis.service';

interface QualityAnalysisJobData extends BaseJobData {
  repositoryId: string;
}

/**
 * Consumes `quality-analysis` jobs enqueued by `QualityService#triggerScan`.
 *
 * All failure handling (marking the `AiAnalysisRun` FAILED, keeping the
 * previous snapshot as the last-known-good value) already lives inside
 * `QualityAnalysisService#analyzeRepository` — devlytics.md §4.2 "failures
 * freeze, they do not drift". This processor only needs to rethrow so
 * BullMQ's retry/backoff (queue.module.ts) takes over.
 */
@Processor(QUEUE.QUALITY_ANALYSIS)
export class QualityAnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(QualityAnalysisProcessor.name);

  constructor(private readonly qualityAnalysis: QualityAnalysisService) {
    super();
  }

  async process(job: Job<QualityAnalysisJobData>): Promise<void> {
    const { organizationId, repositoryId, requestedBy } = job.data;

    const result = await this.qualityAnalysis.analyzeRepository(
      organizationId,
      repositoryId,
      requestedBy,
    );

    this.logger.log(
      `Quality scan run #${result.runNumber} for repository ${repositoryId}: ` +
        `${result.issuesFound} issues, quality score ${result.qualityScore}`,
    );
  }
}

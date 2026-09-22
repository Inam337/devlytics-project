import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE, BaseJobData } from '../../queue/queue.constants';
import { AiAnalysisService } from '../ai-analysis.service';

interface AiAnalysisJobData extends BaseJobData {
  runId: string;
}

/**
 * Consumes `ai-analysis` jobs enqueued by `AiAnalysisService#triggerAnalysis`
 * / `#retry`. Status transitions (RUNNING → COMPLETED/FAILED) live in
 * `AiAnalysisService#runInterpretation`, not here — this processor only
 * rethrows on an unexpected error so BullMQ's retry/backoff takes over.
 */
@Processor(QUEUE.AI_ANALYSIS)
export class AiAnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(AiAnalysisProcessor.name);

  constructor(private readonly aiAnalysis: AiAnalysisService) {
    super();
  }

  async process(job: Job<AiAnalysisJobData>): Promise<void> {
    const { organizationId, runId, requestedBy } = job.data;

    const result = await this.aiAnalysis.runInterpretation(
      organizationId,
      runId,
      requestedBy,
    );

    this.logger.log(
      `AI interpretation for run ${runId}: ${result.interpreted} issue(s) interpreted, ` +
        `${result.recommendations} recommendation(s), aiAvailable=${result.aiAvailable}`,
    );
  }
}

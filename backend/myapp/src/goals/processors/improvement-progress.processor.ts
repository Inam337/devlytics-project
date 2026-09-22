import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobData, QUEUE } from '../../queue/queue.constants';
import { GoalsService } from '../goals.service';

type ImprovementProgressJobData = BaseJobData;

/**
 * Consumes `improvement-progress` jobs enqueued by
 * `QualityAnalysisService#analyzeRepository` after every completed run
 * (git-sync, a standalone quality scan, or an AI analysis trigger) — the one
 * place a new snapshot exists to re-measure goals against
 * (devlytics.md §1.3: completion is computed from a later run, never set
 * manually).
 */
@Processor(QUEUE.IMPROVEMENT_PROGRESS)
export class ImprovementProgressProcessor extends WorkerHost {
  private readonly logger = new Logger(ImprovementProgressProcessor.name);

  constructor(private readonly goals: GoalsService) {
    super();
  }

  async process(job: Job<ImprovementProgressJobData>): Promise<void> {
    const { organizationId, repositoryId } = job.data;
    if (!repositoryId) return;

    const evaluated = await this.goals.evaluateForRepository(
      organizationId,
      repositoryId,
    );

    this.logger.log(
      `Re-evaluated ${evaluated} active goal(s) for repository ${repositoryId}`,
    );
  }
}

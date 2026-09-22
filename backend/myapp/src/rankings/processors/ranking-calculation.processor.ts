import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { RankingPeriod } from '@prisma/client';
import { Job } from 'bullmq';
import { PeriodUtil } from '../../common/utils/period.util';
import { BaseJobData, QUEUE } from '../../queue/queue.constants';
import { ScoringService } from '../../scoring/scoring.service';
import { RankingsService } from '../rankings.service';

interface RankingCalculationJobData extends BaseJobData {
  period: RankingPeriod;
  /** ISO date the period window is resolved against; defaults to now. */
  reference?: string;
}

/**
 * Consumes `ranking-calculation` jobs: recomputes developer/team scores for
 * the requested period (scoring.service.ts#recomputeOrganization — each row
 * versioned by the active weight version, devlytics.md §5.1) then closes the
 * period's leaderboard (rankings.service.ts#closePeriod), appending to
 * `tbl_ranking_history` rather than rewriting it.
 *
 * Enqueued from `GitSyncProcessor` after every sync (per-org, deduped by a
 * deterministic jobId so N repositories syncing the same day only recompute
 * once) and, once WOR-12 lands, from the period-close scheduled job.
 */
@Processor(QUEUE.RANKING_CALCULATION)
export class RankingCalculationProcessor extends WorkerHost {
  private readonly logger = new Logger(RankingCalculationProcessor.name);

  constructor(
    private readonly scoring: ScoringService,
    private readonly rankings: RankingsService,
  ) {
    super();
  }

  async process(job: Job<RankingCalculationJobData>): Promise<void> {
    const { organizationId, period, reference } = job.data;
    const referenceDate = reference ? new Date(reference) : new Date();
    const periodRange = PeriodUtil.resolve(period, referenceDate);

    const scores = await this.scoring.recomputeOrganization(
      organizationId,
      periodRange,
      'LIVE',
    );
    const rankings = await this.rankings.closePeriod(
      organizationId,
      period,
      referenceDate,
    );

    this.logger.log(
      `Ranking calculation for org ${organizationId} (${period}): ` +
        `${scores.developers} developer score(s), ${scores.teams} team score(s), ` +
        `${rankings.developers} developer ranking(s), ${rankings.teams} team ranking(s)`,
    );
  }
}

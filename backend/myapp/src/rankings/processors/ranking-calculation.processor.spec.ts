import type { Job } from 'bullmq';
import type { ScoringService } from '../../scoring/scoring.service';
import type { RankingsService } from '../rankings.service';
import { RankingCalculationProcessor } from './ranking-calculation.processor';

describe('RankingCalculationProcessor', () => {
  let scoring: { recomputeOrganization: jest.Mock };
  let rankings: { closePeriod: jest.Mock };
  let processor: RankingCalculationProcessor;

  beforeEach(() => {
    scoring = { recomputeOrganization: jest.fn() };
    rankings = { closePeriod: jest.fn() };
    processor = new RankingCalculationProcessor(
      scoring as unknown as ScoringService,
      rankings as unknown as RankingsService,
    );
  });

  function job(data: Record<string, unknown>): Job {
    return { data } as unknown as Job;
  }

  it('recomputes scores for the resolved period window, then closes that period', async () => {
    scoring.recomputeOrganization.mockResolvedValue({
      developers: 5,
      teams: 2,
    });
    rankings.closePeriod.mockResolvedValue({ developers: 5, teams: 2 });

    await processor.process(
      job({
        organizationId: 'org-1',
        period: 'MONTHLY',
        reference: '2026-02-15T00:00:00.000Z',
      }),
    );

    expect(scoring.recomputeOrganization).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        period: 'MONTHLY',
        start: new Date(Date.UTC(2026, 1, 1)),
        end: new Date(Date.UTC(2026, 1, 28)),
      }),
      'LIVE',
    );
    expect(rankings.closePeriod).toHaveBeenCalledWith(
      'org-1',
      'MONTHLY',
      new Date('2026-02-15T00:00:00.000Z'),
    );
  });

  it('defaults the reference date to now when the job omits it', async () => {
    scoring.recomputeOrganization.mockResolvedValue({
      developers: 0,
      teams: 0,
    });
    rankings.closePeriod.mockResolvedValue({ developers: 0, teams: 0 });

    await processor.process(job({ organizationId: 'org-1', period: 'DAILY' }));

    expect(scoring.recomputeOrganization).toHaveBeenCalled();
    expect(rankings.closePeriod).toHaveBeenCalledWith(
      'org-1',
      'DAILY',
      expect.any(Date),
    );
  });
});

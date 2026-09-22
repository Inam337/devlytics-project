import type { Job } from 'bullmq';
import type { MetricsAggregationService } from '../metrics-aggregation.service';
import { MetricsCalculationProcessor } from './metrics-calculation.processor';

describe('MetricsCalculationProcessor', () => {
  let metrics: { rebuildRecent: jest.Mock };
  let processor: MetricsCalculationProcessor;

  beforeEach(() => {
    metrics = { rebuildRecent: jest.fn() };
    processor = new MetricsCalculationProcessor(
      metrics as unknown as MetricsAggregationService,
    );
  });

  function job(data: Record<string, unknown>): Job {
    return { data } as unknown as Job;
  }

  it('rebuilds recent metrics for the job organization', async () => {
    metrics.rebuildRecent.mockResolvedValue({ developerRows: 4, teamRows: 2 });

    await processor.process(job({ organizationId: 'org-1' }));

    expect(metrics.rebuildRecent).toHaveBeenCalledWith('org-1', undefined);
  });

  it('passes through an explicit lookback window when the job specifies one', async () => {
    metrics.rebuildRecent.mockResolvedValue({ developerRows: 0, teamRows: 0 });

    await processor.process(job({ organizationId: 'org-1', days: 30 }));

    expect(metrics.rebuildRecent).toHaveBeenCalledWith('org-1', 30);
  });
});

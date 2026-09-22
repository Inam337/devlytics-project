import type { Job } from 'bullmq';
import type { QualityAnalysisService } from '../quality-analysis.service';
import { QualityAnalysisProcessor } from './quality-analysis.processor';

describe('QualityAnalysisProcessor', () => {
  let analysis: { analyzeRepository: jest.Mock };
  let processor: QualityAnalysisProcessor;

  beforeEach(() => {
    analysis = { analyzeRepository: jest.fn() };
    processor = new QualityAnalysisProcessor(
      analysis as unknown as QualityAnalysisService,
    );
  });

  function job(data: Record<string, unknown>): Job {
    return { data } as unknown as Job;
  }

  it('runs the deterministic analysis for the job repository', async () => {
    analysis.analyzeRepository.mockResolvedValue({
      runId: 'run-1',
      runNumber: 3,
      repositoryId: 'repo-1',
      issuesFound: 2,
      qualityScore: 87.5,
    });

    await processor.process(
      job({
        organizationId: 'org-1',
        repositoryId: 'repo-1',
        requestedBy: 'user-1',
      }),
    );

    expect(analysis.analyzeRepository).toHaveBeenCalledWith(
      'org-1',
      'repo-1',
      'user-1',
    );
  });

  it('rethrows so BullMQ retries the job instead of silently dropping the scan', async () => {
    analysis.analyzeRepository.mockRejectedValue(
      new Error('git provider unreachable'),
    );

    await expect(
      processor.process(
        job({ organizationId: 'org-1', repositoryId: 'repo-1' }),
      ),
    ).rejects.toThrow('git provider unreachable');
  });
});

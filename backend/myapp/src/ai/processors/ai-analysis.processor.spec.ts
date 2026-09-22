import type { Job } from 'bullmq';
import type { AiAnalysisService } from '../ai-analysis.service';
import { AiAnalysisProcessor } from './ai-analysis.processor';

describe('AiAnalysisProcessor', () => {
  let aiAnalysis: { runInterpretation: jest.Mock };
  let processor: AiAnalysisProcessor;

  beforeEach(() => {
    aiAnalysis = { runInterpretation: jest.fn() };
    processor = new AiAnalysisProcessor(
      aiAnalysis as unknown as AiAnalysisService,
    );
  });

  function job(data: Record<string, unknown>): Job {
    return { data } as unknown as Job;
  }

  it('interprets the run identified by the job payload', async () => {
    aiAnalysis.runInterpretation.mockResolvedValue({
      interpreted: 2,
      recommendations: 2,
      aiAvailable: true,
    });

    await processor.process(
      job({ organizationId: 'org-1', runId: 'run-1', requestedBy: 'user-1' }),
    );

    expect(aiAnalysis.runInterpretation).toHaveBeenCalledWith(
      'org-1',
      'run-1',
      'user-1',
    );
  });

  it('rethrows so BullMQ retries instead of silently dropping the interpretation', async () => {
    aiAnalysis.runInterpretation.mockRejectedValue(
      new Error('provider timeout'),
    );

    await expect(
      processor.process(job({ organizationId: 'org-1', runId: 'run-1' })),
    ).rejects.toThrow('provider timeout');
  });
});

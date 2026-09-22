import type { Job } from 'bullmq';
import type { GoalsService } from '../goals.service';
import { ImprovementProgressProcessor } from './improvement-progress.processor';

describe('ImprovementProgressProcessor', () => {
  let goals: { evaluateForRepository: jest.Mock };
  let processor: ImprovementProgressProcessor;

  beforeEach(() => {
    goals = { evaluateForRepository: jest.fn() };
    processor = new ImprovementProgressProcessor(
      goals as unknown as GoalsService,
    );
  });

  function job(data: Record<string, unknown>): Job {
    return { data } as unknown as Job;
  }

  it('re-evaluates goals for the repository the analysis run covered', async () => {
    goals.evaluateForRepository.mockResolvedValue(3);

    await processor.process(
      job({ organizationId: 'org-1', repositoryId: 'repo-1' }),
    );

    expect(goals.evaluateForRepository).toHaveBeenCalledWith('org-1', 'repo-1');
  });

  it('does nothing for an organization-scoped job with no repository', async () => {
    await processor.process(job({ organizationId: 'org-1' }));

    expect(goals.evaluateForRepository).not.toHaveBeenCalled();
  });
});

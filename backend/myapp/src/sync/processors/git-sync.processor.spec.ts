import type { Job, Queue } from 'bullmq';
import type { AchievementsService } from '../../achievements/achievements.service';
import type { ExperimentsService } from '../../improvements/experiments.service';
import type { MetricsAggregationService } from '../../metrics/metrics-aggregation.service';
import type { PrismaService } from '../../database/prisma.service';
import type { QualityAnalysisService } from '../../quality/quality-analysis.service';
import type { CollectorService } from '../collector.service';
import type { SyncService } from '../sync.service';
import { GitSyncProcessor } from './git-sync.processor';

describe('GitSyncProcessor', () => {
  let collector: { collect: jest.Mock };
  let sync: {
    markRunning: jest.Mock;
    markProgress: jest.Mock;
    markCompleted: jest.Mock;
    markFailed: jest.Mock;
  };
  let metrics: { rebuildRecent: jest.Mock };
  let qualityAnalysis: { analyzeRepository: jest.Mock };
  let achievements: { evaluateForUser: jest.Mock };
  let experiments: { refreshActiveExperimentMetrics: jest.Mock };
  let prisma: { repositoryMember: { findMany: jest.Mock } };
  let rankingQueue: { add: jest.Mock };
  let processor: GitSyncProcessor;

  beforeEach(() => {
    collector = { collect: jest.fn().mockResolvedValue({ total: 10 }) };
    sync = {
      markRunning: jest.fn(),
      markProgress: jest.fn(),
      markCompleted: jest.fn(),
      markFailed: jest.fn(),
    };
    metrics = { rebuildRecent: jest.fn() };
    qualityAnalysis = {
      analyzeRepository: jest.fn().mockResolvedValue({ qualityScore: 75 }),
    };
    achievements = { evaluateForUser: jest.fn() };
    experiments = { refreshActiveExperimentMetrics: jest.fn() };
    prisma = {
      repositoryMember: { findMany: jest.fn().mockResolvedValue([]) },
    };
    rankingQueue = { add: jest.fn().mockResolvedValue({}) };

    processor = new GitSyncProcessor(
      collector as unknown as CollectorService,
      sync as unknown as SyncService,
      metrics as unknown as MetricsAggregationService,
      qualityAnalysis as unknown as QualityAnalysisService,
      achievements as unknown as AchievementsService,
      experiments as unknown as ExperimentsService,
      prisma as unknown as PrismaService,
      rankingQueue as unknown as Queue,
    );
  });

  function job(
    data: Record<string, unknown>,
    opts: { attemptsMade?: number; maxAttempts?: number } = {},
  ): Job {
    return {
      data,
      name: 'FULL_IMPORT',
      attemptsMade: opts.attemptsMade ?? 1,
      opts: { attempts: opts.maxAttempts ?? 5 },
    } as unknown as Job;
  }

  it('enqueues a ranking-calculation job for the organization after a successful sync', async () => {
    await processor.process(
      job({
        organizationId: 'org-1',
        repositoryId: 'repo-1',
        syncJobId: 'job-1',
        requestedBy: 'user-1',
      }),
    );

    expect(rankingQueue.add).toHaveBeenCalledWith(
      'recompute',
      { organizationId: 'org-1', period: 'DAILY', requestedBy: 'user-1' },
      expect.objectContaining({
        jobId: expect.stringMatching(
          /^ranking-calc-org-1-DAILY-\d{4}-\d{2}-\d{2}$/,
        ),
      }),
    );
    expect(sync.markCompleted).toHaveBeenCalledWith('job-1', 10);
  });

  it('does not enqueue ranking calculation and marks a mid-retry failure as non-final', async () => {
    qualityAnalysis.analyzeRepository.mockRejectedValue(
      new Error('scan failed'),
    );

    // BullMQ's job.attemptsMade is 0-indexed *during* process() — this is the
    // 2nd of 5 attempts (attemptsMade=1 going in), so retries remain.
    await expect(
      processor.process(
        job(
          {
            organizationId: 'org-1',
            repositoryId: 'repo-1',
            syncJobId: 'job-1',
          },
          { attemptsMade: 1, maxAttempts: 5 },
        ),
      ),
    ).rejects.toThrow('scan failed');

    expect(rankingQueue.add).not.toHaveBeenCalled();
    expect(sync.markFailed).toHaveBeenCalledWith('job-1', 'scan failed', false);
  });

  it('marks the failure final on the last of the configured attempts', async () => {
    qualityAnalysis.analyzeRepository.mockRejectedValue(
      new Error('scan failed'),
    );

    // The 5th (last) of 5 attempts reports attemptsMade=4 going in.
    await expect(
      processor.process(
        job(
          {
            organizationId: 'org-1',
            repositoryId: 'repo-1',
            syncJobId: 'job-1',
          },
          { attemptsMade: 4, maxAttempts: 5 },
        ),
      ),
    ).rejects.toThrow('scan failed');

    expect(sync.markFailed).toHaveBeenCalledWith('job-1', 'scan failed', true);
  });
});

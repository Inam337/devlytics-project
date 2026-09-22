import type { Queue } from 'bullmq';
import type { PrismaService } from '../database/prisma.service';
import type { QualityAnalysisService } from '../quality/quality-analysis.service';
import { AiAnalysisService } from './ai-analysis.service';
import type { AiProvidersService } from './ai-providers.service';

describe('AiAnalysisService', () => {
  let prisma: {
    repository: { findFirst: jest.Mock };
    aiAnalysisRun: { findFirst: jest.Mock; update: jest.Mock };
    codeQualityIssue: { findMany: jest.Mock };
  };
  let providers: { resolveAdapter: jest.Mock };
  let qualityAnalysis: { analyzeRepository: jest.Mock };
  let queue: { add: jest.Mock };
  let service: AiAnalysisService;

  beforeEach(() => {
    prisma = {
      repository: { findFirst: jest.fn() },
      aiAnalysisRun: { findFirst: jest.fn(), update: jest.fn() },
      codeQualityIssue: { findMany: jest.fn() },
    };
    providers = { resolveAdapter: jest.fn() };
    qualityAnalysis = { analyzeRepository: jest.fn() };
    queue = { add: jest.fn().mockResolvedValue({}) };
    prisma.aiAnalysisRun.update.mockResolvedValue({});

    service = new AiAnalysisService(
      prisma as unknown as PrismaService,
      providers as unknown as AiProvidersService,
      qualityAnalysis as unknown as QualityAnalysisService,
      queue as unknown as Queue,
    );
  });

  const actor = { actorId: 'user-1' };

  describe('triggerAnalysis', () => {
    it('runs the deterministic pass inline and queues interpretation instead of running it inline', async () => {
      prisma.repository.findFirst.mockResolvedValue({
        id: 'repo-1',
        fullName: 'org/repo',
      });
      qualityAnalysis.analyzeRepository.mockResolvedValue({
        runId: 'run-1',
        runNumber: 4,
        repositoryId: 'repo-1',
        issuesFound: 2,
        qualityScore: 80,
      });

      const result = await service.triggerAnalysis('org-1', 'repo-1', actor);

      expect(qualityAnalysis.analyzeRepository).toHaveBeenCalledWith(
        'org-1',
        'repo-1',
        'user-1',
      );
      // Run flips to RUNNING for the AI phase before the job is queued.
      expect(prisma.aiAnalysisRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: { status: 'RUNNING' },
      });
      expect(queue.add).toHaveBeenCalledWith(
        'interpret-analysis',
        expect.objectContaining({
          organizationId: 'org-1',
          repositoryId: 'repo-1',
          runId: 'run-1',
          requestedBy: 'user-1',
        }),
        expect.objectContaining({ jobId: expect.any(String) }),
      );
      // The AI provider round-trip never runs inline in the request.
      expect(providers.resolveAdapter).not.toHaveBeenCalled();
      expect(result).toEqual({
        runId: 'run-1',
        runNumber: 4,
        qualityScore: 80,
        issuesFound: 2,
        queued: true,
      });
    });

    it('throws not-found for a repository outside the organization', async () => {
      prisma.repository.findFirst.mockResolvedValue(null);

      await expect(
        service.triggerAnalysis('org-1', 'missing-repo', actor),
      ).rejects.toThrow();
      expect(qualityAnalysis.analyzeRepository).not.toHaveBeenCalled();
    });
  });

  describe('retry', () => {
    it('re-queues interpretation for an existing run instead of running it inline', async () => {
      prisma.aiAnalysisRun.findFirst.mockResolvedValue({
        id: 'run-1',
        repositoryId: 'repo-1',
      });

      const result = await service.retry('org-1', 'run-1', actor);

      expect(queue.add).toHaveBeenCalledWith(
        'interpret-analysis',
        expect.objectContaining({ runId: 'run-1', repositoryId: 'repo-1' }),
        expect.anything(),
      );
      expect(result).toEqual({ runId: 'run-1', queued: true });
    });
  });

  describe('runInterpretation', () => {
    it('marks the run COMPLETED when interpretation finishes (including a soft AI-unavailable outcome)', async () => {
      prisma.codeQualityIssue.findMany.mockResolvedValue([]);

      const result = await service.runInterpretation(
        'org-1',
        'run-1',
        'user-1',
      );

      expect(result).toEqual({
        interpreted: 0,
        recommendations: 0,
        aiAvailable: true,
      });
      expect(prisma.aiAnalysisRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: { status: 'COMPLETED' },
      });
    });

    it('marks the run FAILED on an unexpected error and rethrows for BullMQ retry', async () => {
      prisma.codeQualityIssue.findMany.mockRejectedValue(
        new Error('db unreachable'),
      );

      await expect(
        service.runInterpretation('org-1', 'run-1', 'user-1'),
      ).rejects.toThrow('db unreachable');

      expect(prisma.aiAnalysisRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: { status: 'FAILED', errorMessage: 'db unreachable' },
      });
    });
  });
});

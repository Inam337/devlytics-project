import type { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { AppException } from '../common/exceptions/app.exception';
import type { PrismaService } from '../database/prisma.service';
import { QualityAnalysisService } from './quality-analysis.service';

describe('QualityAnalysisService', () => {
  let prisma: {
    repository: { findFirst: jest.Mock };
    commit: { aggregate: jest.Mock };
    commitFile: { aggregate: jest.Mock; count: jest.Mock };
    pullRequest: { count: jest.Mock };
    ciPipeline: { aggregate: jest.Mock; count: jest.Mock };
    aiAnalysisRun: {
      create: jest.Mock;
      update: jest.Mock;
      findFirst: jest.Mock;
    };
    codeQualityIssue: { createMany: jest.Mock };
    codeQualitySnapshot: { upsert: jest.Mock };
  };
  let queue: { add: jest.Mock };
  let service: QualityAnalysisService;

  const repository = {
    id: 'repo-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    fullName: 'devlytics-demo/customer-portal-web',
  };

  /**
   * Wires up evidence that trips four of the five deterministic rules
   * (everything except the commit-file-span complexity rule), so the
   * findings -> createMany -> snapshot pipeline gets real end-to-end
   * coverage instead of a hand-substituted findings array.
   *
   *  - commits: 20, avg 10 files/commit (below the 12-file complexity threshold)
   *  - filesChanged: 100, testFileChanges: 10 -> 10% test-change ratio (CRITICAL, <20%)
   *  - docFileChanges: 1 -> 5% of 20 commits (MINOR, not <5%)
   *  - totalPullRequests: 10, largePullRequests: 3 -> 30% large (MINOR, >=25% but <=60%)
   *  - totalBuilds: 10, failedBuilds: 5 -> 50% CI failure rate (CRITICAL, >40%)
   */
  function mockEvidenceGathering() {
    prisma.commit.aggregate
      .mockResolvedValueOnce({
        _count: { _all: 20 },
        _sum: { changedFiles: 200 },
      })
      .mockResolvedValueOnce({ _sum: { additions: 500, deletions: 100 } }); // buildSnapshot's totalLoc call
    prisma.commitFile.aggregate.mockResolvedValue({ _count: { _all: 100 } });
    prisma.pullRequest.count
      .mockResolvedValueOnce(10) // total pull requests
      .mockResolvedValueOnce(3); // large pull requests
    prisma.ciPipeline.aggregate.mockResolvedValue({ _count: { _all: 10 } });
    prisma.commitFile.count
      .mockResolvedValueOnce(10) // test file changes
      .mockResolvedValueOnce(1); // doc file changes
    prisma.ciPipeline.count.mockResolvedValue(5); // failed builds
  }

  beforeEach(() => {
    prisma = {
      repository: { findFirst: jest.fn().mockResolvedValue(repository) },
      commit: { aggregate: jest.fn() },
      commitFile: { aggregate: jest.fn(), count: jest.fn() },
      pullRequest: { count: jest.fn() },
      ciPipeline: { aggregate: jest.fn(), count: jest.fn() },
      aiAnalysisRun: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'run-1', startedAt: new Date() }),
        update: jest.fn().mockResolvedValue(undefined),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      codeQualityIssue: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      codeQualitySnapshot: {
        upsert: jest.fn().mockResolvedValue({ id: 'snapshot-1' }),
      },
    };
    queue = { add: jest.fn().mockResolvedValue({}) };

    service = new QualityAnalysisService(
      prisma as unknown as PrismaService,
      { get: jest.fn() } as unknown as ConfigService,
      queue as unknown as Queue,
    );
  });

  it('throws not-found for a repository outside the organization, before running any analysis', async () => {
    prisma.repository.findFirst.mockResolvedValue(null);

    await expect(
      service.analyzeRepository('org-1', 'repo-from-other-org'),
    ).rejects.toThrow(AppException);
    expect(prisma.aiAnalysisRun.create).not.toHaveBeenCalled();
  });

  it('assigns runNumber 1 for an organization with no prior analysis runs', async () => {
    mockEvidenceGathering();

    await service.analyzeRepository('org-1', 'repo-1');

    expect(prisma.aiAnalysisRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ runNumber: 1 }),
      }),
    );
  });

  it('increments runNumber from the organization last run rather than always starting at 1', async () => {
    mockEvidenceGathering();
    prisma.aiAnalysisRun.findFirst.mockResolvedValue({ runNumber: 5 });

    await service.analyzeRepository('org-1', 'repo-1');

    expect(prisma.aiAnalysisRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ runNumber: 6 }),
      }),
    );
  });

  it('creates one code-quality issue per triggered rule, mapped from the finding', async () => {
    mockEvidenceGathering();

    await service.analyzeRepository('org-1', 'repo-1', 'user-1');

    expect(prisma.codeQualityIssue.createMany).toHaveBeenCalledTimes(1);
    const rows = prisma.codeQualityIssue.createMany.mock.calls[0][0]
      .data as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.ruleId)).toEqual(
      expect.arrayContaining([
        'RULE_LOW_TEST_COVERAGE_PROXY',
        'RULE_LOW_DOCUMENTATION_RATIO',
        'RULE_LARGE_PULL_REQUESTS',
        'RULE_CI_FAILURE_RATE',
      ]),
    );
    expect(rows.every((row) => row.organizationId === 'org-1')).toBe(true);
    expect(rows.every((row) => row.analysisRunId === 'run-1')).toBe(true);
  });

  it('skips codeQualityIssue.createMany entirely when no rule triggers', async () => {
    prisma.commit.aggregate
      .mockResolvedValueOnce({
        _count: { _all: 5 },
        _sum: { changedFiles: 25 },
      }) // avg 5 files/commit
      .mockResolvedValueOnce({ _sum: { additions: 0, deletions: 0 } });
    prisma.commitFile.aggregate.mockResolvedValue({ _count: { _all: 10 } });
    prisma.pullRequest.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    prisma.ciPipeline.aggregate.mockResolvedValue({ _count: { _all: 0 } });
    prisma.commitFile.count
      .mockResolvedValueOnce(10) // 100% test-change ratio
      .mockResolvedValueOnce(1); // 20% doc ratio (>=15%, no finding)
    prisma.ciPipeline.count.mockResolvedValue(0);

    await service.analyzeRepository('org-1', 'repo-1');

    expect(prisma.codeQualityIssue.createMany).not.toHaveBeenCalled();
  });

  it('derives the quality score from the coverage/CI/maintainability blend and persists it on the snapshot', async () => {
    mockEvidenceGathering();

    const result = await service.analyzeRepository('org-1', 'repo-1');

    // testCoverageProxy = percent(10, 100) = 10
    // ciReliability = percent(10-5, 10) = 50
    // maintainability = clamp(100 - 4*8 - max(0, 60-10)*0.3) = clamp(100-32-15) = 53
    // qualityScore = clamp(10*.35 + 50*.35 + 53*.3) = clamp(3.5+17.5+15.9) = 36.9
    expect(result.qualityScore).toBeCloseTo(36.9, 5);
    expect(result.issuesFound).toBe(4);
    const upsertArgs = prisma.codeQualitySnapshot.upsert.mock.calls[0][0];
    expect(upsertArgs.create.codeSmells).toBe(4);
    expect(upsertArgs.create.qualityScore.toNumber()).toBeCloseTo(36.9, 5);
  });

  it('marks the run COMPLETED and enqueues goal re-evaluation on success', async () => {
    mockEvidenceGathering();

    await service.analyzeRepository('org-1', 'repo-1', 'user-1');

    expect(prisma.aiAnalysisRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'run-1' },
        data: expect.objectContaining({ status: 'COMPLETED', issuesFound: 4 }),
      }),
    );
    expect(queue.add).toHaveBeenCalledWith(
      'evaluate-goals',
      expect.objectContaining({
        organizationId: 'org-1',
        repositoryId: 'repo-1',
        requestedBy: 'user-1',
      }),
      undefined,
    );
  });

  it('marks the run FAILED and rethrows, leaving the last snapshot untouched, when persistence fails mid-analysis', async () => {
    mockEvidenceGathering();
    prisma.codeQualityIssue.createMany.mockRejectedValue(
      new Error('constraint violation'),
    );

    await expect(service.analyzeRepository('org-1', 'repo-1')).rejects.toThrow(
      'constraint violation',
    );

    expect(prisma.aiAnalysisRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'run-1' },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'constraint violation',
        }),
      }),
    );
    expect(prisma.codeQualitySnapshot.upsert).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });
});

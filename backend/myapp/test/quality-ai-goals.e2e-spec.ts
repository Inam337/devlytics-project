import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from './utils/setup-app';
import { resetDatabase } from './utils/reset-database';

/**
 * Requirements doc §16 E2E flow (continued): Quality Scan -> AI Analysis ->
 * Recommendation -> Goal -> Self Evaluation -> Goal Progress -> Re-analysis.
 *
 * devlytics.md §1.3: a goal completes only when a later analysis run proves
 * it against a stored baseline. devlytics.md §1.2: every AI finding must
 * separate observed fact / AI inference / recommendation.
 *
 * This suite queues real BullMQ jobs (quality-analysis, ai-analysis,
 * improvement-progress) against the real Postgres/Redis stack, so most steps
 * poll rather than asserting immediately after the HTTP call returns.
 *
 * The Ollama provider is not running in this environment, so `global.fetch`
 * is stubbed for the one call `OllamaAdapter#complete` makes
 * (`${baseUrl}/api/generate`) to produce a deterministic
 * inference/confidence/recommendation without a real model.
 */
describe('Quality -> AI -> Goals (e2e)', () => {
  jest.setTimeout(60_000);

  let app: INestApplication;
  let prisma: PrismaClient;
  let originalFetch: typeof global.fetch;

  let token: string;
  let organizationId: string;
  let userId: string;
  let repositoryId: string;

  const stamp = Date.now();
  let commitCounter = 0;

  beforeAll(async () => {
    await resetDatabase();
    app = await createTestApp();
    prisma = new PrismaClient();

    const registered = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `qag${stamp}@example.test`,
        firstName: 'Quality',
        lastName: 'Admin',
        password: 'Str0ng!Passphrase',
        organization: { name: `Quality AI Goals Org ${stamp}` },
      });
    token = registered.body.data.accessToken;
    organizationId = registered.body.data.organization.id;
    userId = registered.body.data.user.id;

    // No git-provider-connect flow is exercised here (WOR-18's territory) —
    // the provider/repository rows are seeded directly so this suite can
    // control the evidence deterministically.
    const provider = await prisma.gitProvider.create({
      data: {
        organizationId,
        providerType: 'GITHUB',
        displayName: 'Seed GitHub',
        externalAccountId: `acct-${stamp}`,
      },
    });

    const repository = await prisma.repository.create({
      data: {
        organizationId,
        providerId: provider.id,
        externalRepositoryId: `repo-${stamp}`,
        name: 'quality-ai-goals',
        fullName: `qag-org-${stamp}/quality-ai-goals`,
      },
    });
    repositoryId = repository.id;

    // Deterministic stand-in for the local Ollama provider — the only
    // outbound call this flow makes is OllamaAdapter#complete's POST to
    // `${baseUrl}/api/generate`.
    originalFetch = global.fetch;
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const href = typeof input === 'string' ? input : input.toString();
      if (!href.includes('/api/generate')) {
        throw new Error(`Unexpected fetch call in e2e test: ${href}`);
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          response: JSON.stringify({
            inference:
              'Low test-file coverage on recent changes correlates with elevated regression risk for this repository.',
            confidence: 0.87,
            recommendation:
              'Require a companion test-file change for every non-trivial pull request touching this repository.',
          }),
          prompt_eval_count: 42,
          eval_count: 64,
        }),
      } as unknown as Response;
    }) as unknown as typeof global.fetch;
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    await prisma.$disconnect();
    await app.close();
  });

  const server = () => app.getHttpServer();
  const auth = () => `Bearer ${token}`;

  async function waitFor<T>(
    fn: () => Promise<T | null | undefined | false>,
    { timeoutMs = 25_000, intervalMs = 300 } = {},
  ): Promise<T> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const result = await fn();
      if (result) return result;
      if (Date.now() > deadline) {
        throw new Error('waitFor: condition never became true');
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  /**
   * Directly seeds `tbl_commit`/`tbl_commit_file` rows so
   * `QualityAnalysisService#gatherEvidence` has deterministic activity to
   * evaluate `quality-rules.ts` against, without depending on WOR-18's
   * git-connect/sync pipeline.
   */
  async function seedEvidenceBatch(opts: {
    commits: number;
    filesPerCommit: number;
    testFiles: number;
    label: string;
  }) {
    let testFilesRemaining = opts.testFiles;
    for (let c = 0; c < opts.commits; c++) {
      commitCounter += 1;
      const commit = await prisma.commit.create({
        data: {
          organizationId,
          repositoryId,
          externalCommitId: `${opts.label}-${stamp}-${commitCounter}`,
          commitHash: `${opts.label}${commitCounter}`
            .padEnd(40, '0')
            .slice(0, 40),
          message: `chore: ${opts.label} seed commit ${commitCounter}`,
          committedAt: new Date(Date.now() - commitCounter * 60_000),
          additions: 20,
          deletions: 4,
          changedFiles: opts.filesPerCommit,
          isBot: false,
        },
      });
      for (let f = 0; f < opts.filesPerCommit; f++) {
        const isTest = testFilesRemaining > 0;
        if (isTest) testFilesRemaining -= 1;
        await prisma.commitFile.create({
          data: {
            commitId: commit.id,
            filePath: `src/${opts.label}-${commitCounter}-${f}.ts`,
            changeType: 'MODIFIED',
            additions: 5,
            deletions: 1,
            isTestFile: isTest,
            isDocFile: false,
          },
        });
      }
    }
  }

  let firstAnalysisRunId: string;
  let recommendationId: string;
  let qualityIssueId: string;
  let goalId: string;
  let secondAnalysisRunId: string;

  it('seeds low-test-coverage evidence and runs a quality scan, recording an issue with a rule id', async () => {
    // 10 files changed, 1 of them a test file -> a 10% test-change ratio,
    // well under quality-rules.ts's 60% threshold -> RULE_LOW_TEST_COVERAGE_PROXY.
    await seedEvidenceBatch({
      commits: 5,
      filesPerCommit: 2,
      testFiles: 1,
      label: 'batch-a',
    });

    const scan = await request(server())
      .post('/api/v1/quality/scan')
      .set('Authorization', auth())
      .send({ repositoryId })
      .expect(201);
    expect(scan.body.data.queued).toBe(true);

    const issue = await waitFor(async () => {
      const res = await request(server())
        .get(`/api/v1/quality/issues?repositoryId=${repositoryId}`)
        .set('Authorization', auth())
        .expect(200);
      return (
        res.body.data.find(
          (i: { ruleId: string }) =>
            i.ruleId === 'RULE_LOW_TEST_COVERAGE_PROXY',
        ) ?? null
      );
    });

    expect(issue.ruleId).toBe('RULE_LOW_TEST_COVERAGE_PROXY');
    expect(issue.category).toBe('TESTING');
    expect(typeof issue.observedFact).toBe('string');
    expect(issue.observedFact.length).toBeGreaterThan(0);
  });

  it('runs an AI analysis whose response separates observed fact / AI inference (confidence) / recommendation', async () => {
    const triggered = await request(server())
      .post('/api/v1/ai/analysis')
      .set('Authorization', auth())
      .send({ repositoryId })
      .expect(201);

    // The deterministic quality pass runs inline — a fresh run id is
    // available immediately, even though AI interpretation is queued.
    firstAnalysisRunId = triggered.body.data.runId;
    expect(firstAnalysisRunId).toEqual(expect.any(String));
    expect(triggered.body.data.queued).toBe(true);

    const run = await waitFor(async () => {
      const res = await request(server())
        .get(`/api/v1/ai/analysis/${firstAnalysisRunId}`)
        .set('Authorization', auth())
        .expect(200);
      const body = res.body.data;
      const interpreted = body.qualityIssues?.some(
        (i: { aiInference: string | null }) => i.aiInference,
      );
      return body.status === 'COMPLETED' && interpreted ? body : null;
    });

    const testingIssue = run.qualityIssues.find(
      (i: { category: string }) => i.category === 'TESTING',
    );
    expect(testingIssue).toBeTruthy();
    qualityIssueId = testingIssue.id;

    // Observed fact: the deterministic, rule-id-bearing measurement.
    expect(testingIssue.ruleId).toBe('RULE_LOW_TEST_COVERAGE_PROXY');
    expect(typeof testingIssue.observedFact).toBe('string');
    expect(testingIssue.observedFact.length).toBeGreaterThan(0);

    // AI inference: a distinct field, carrying a confidence score.
    expect(typeof testingIssue.aiInference).toBe('string');
    expect(testingIssue.aiInference.length).toBeGreaterThan(0);
    expect(testingIssue.aiInference).not.toBe(testingIssue.observedFact);
    const confidence = Number(testingIssue.aiConfidence);
    expect(confidence).toBeGreaterThan(0);
    expect(confidence).toBeLessThanOrEqual(1);

    // Recommendation: distinct again, linked back to the same issue.
    const recommendation = run.recommendations.find(
      (r: { qualityIssueId: string }) => r.qualityIssueId === testingIssue.id,
    );
    expect(recommendation).toBeTruthy();
    expect(typeof recommendation.recommendation).toBe('string');
    expect(recommendation.recommendation.length).toBeGreaterThan(0);
    expect(recommendation.recommendation).not.toBe(testingIssue.aiInference);
    expect(recommendation.recommendation).not.toBe(testingIssue.observedFact);
  });

  it('lists the recommendation via the Improvement Center endpoint', async () => {
    const res = await request(server())
      .get('/api/v1/improvements/recommendations?category=TESTING')
      .set('Authorization', auth())
      .expect(200);

    const recommendation = res.body.data.find(
      (r: { qualityIssueId: string }) => r.qualityIssueId === qualityIssueId,
    );
    expect(recommendation).toBeTruthy();
    expect(recommendation.qualityIssue.id).toBe(qualityIssueId);
    recommendationId = recommendation.id;
  });

  it('converts the recommendation into a goal with a recorded baseline', async () => {
    const res = await request(server())
      .post('/api/v1/goals')
      .set('Authorization', auth())
      .send({
        title: 'Raise test-file coverage on quality-ai-goals',
        ownerType: 'DEVELOPER',
        ownerUserId: userId,
        repositoryId,
        qualityIssueId,
        recommendationId,
        category: 'TESTING',
        metricKey: 'coverage_percent',
        direction: 'INCREASE',
        targetValue: 70,
      })
      .expect(201);

    goalId = res.body.data.id;
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.baselineValue).toBe(10);
    expect(res.body.data.currentValue).toBe(10);
    expect(res.body.data.targetValue).toBe(70);
    expect(res.body.data.recommendationId).toBe(recommendationId);
  });

  it('rejects a direct PATCH attempting to set the goal Completed (400)', async () => {
    const res = await request(server())
      .patch(`/api/v1/goals/${goalId}`)
      .set('Authorization', auth())
      .send({ status: 'COMPLETED' })
      .expect(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');

    const stillActive = await request(server())
      .get(`/api/v1/goals/${goalId}`)
      .set('Authorization', auth())
      .expect(200);
    expect(stillActive.body.data.status).toBe('ACTIVE');
  });

  it('submits a self-evaluation', async () => {
    const res = await request(server())
      .post('/api/v1/self-evaluations')
      .set('Authorization', auth())
      .send({
        repositoryId,
        period: 'MONTHLY',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
        summary: 'Working on raising test-file coverage after the AI review.',
        overallRating: 3,
        items: [
          {
            category: 'TESTING',
            selfRating: 3,
            comment: 'Adding tests for recently touched modules.',
          },
        ],
      })
      .expect(201);

    expect(res.body.data.status).toBe('DRAFT');
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].category).toBe('TESTING');
  });

  it('re-measures progress against the existing baseline snapshot — not yet achieved', async () => {
    const res = await request(server())
      .post(`/api/v1/goals/${goalId}/progress`)
      .set('Authorization', auth())
      .expect(201);

    // No new evidence exists yet — recheck must not fabricate movement.
    expect(res.body.data.status).not.toBe('COMPLETED');

    const goal = await request(server())
      .get(`/api/v1/goals/${goalId}`)
      .set('Authorization', auth())
      .expect(200);
    expect(goal.body.data.status).not.toBe('COMPLETED');
    expect(goal.body.data.currentValue).toBe(10);
  });

  it('proves goal completion from a second analysis run measured against the baseline, not a manual PATCH', async () => {
    // 40 more files, all test files. Combined with batch-a this pushes the
    // test-change ratio from 10% to 82% (41 of 50 files) — well past the
    // goal's 70% target.
    await seedEvidenceBatch({
      commits: 8,
      filesPerCommit: 5,
      testFiles: 40,
      label: 'batch-b',
    });

    const reAnalysis = await request(server())
      .post('/api/v1/ai/analysis')
      .set('Authorization', auth())
      .send({ repositoryId })
      .expect(201);
    secondAnalysisRunId = reAnalysis.body.data.runId;
    expect(secondAnalysisRunId).not.toBe(firstAnalysisRunId);

    const completedGoal = await waitFor(async () => {
      const res = await request(server())
        .get(`/api/v1/goals/${goalId}`)
        .set('Authorization', auth())
        .expect(200);
      return res.body.data.status === 'COMPLETED' ? res.body.data : null;
    });

    expect(completedGoal.status).toBe('COMPLETED');
    expect(completedGoal.currentValue).toBeGreaterThanOrEqual(70);
    expect(completedGoal.baselineValue).toBe(10);

    const progress = await request(server())
      .get(`/api/v1/goals/${goalId}/progress`)
      .set('Authorization', auth())
      .expect(200);
    const entries = progress.body.data;
    expect(entries.length).toBeGreaterThan(0);
    const last = entries[entries.length - 1];
    expect(last.analysisRunId).toBe(secondAnalysisRunId);
    expect(Number(last.measuredValue)).toBeGreaterThanOrEqual(70);

    // Completion came from re-analysis alone — a direct PATCH still cannot
    // set it, even now that the goal has already completed.
    const patchAttempt = await request(server())
      .patch(`/api/v1/goals/${goalId}`)
      .set('Authorization', auth())
      .send({ status: 'COMPLETED' })
      .expect(400);
    expect(patchAttempt.body.code).toBe('VALIDATION_FAILED');
  });
});

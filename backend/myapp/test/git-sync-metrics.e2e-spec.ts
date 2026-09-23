import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ProviderAdapterFactory } from '../src/git/providers/provider-adapter.factory';
import type {
  ProviderCommit,
  ProviderIssue,
  ProviderPullRequest,
  ProviderReview,
} from '../src/git/providers/git-provider.adapter';
import { createTestApp } from './utils/setup-app';
import { resetDatabase } from './utils/reset-database';
import {
  FAKE_REPOS,
  FakeProviderAdapterFactory,
  FakeRepoFixture,
} from './utils/fake-git-provider';

jest.setTimeout(60000);

/** Polls `check` until it resolves truthy, or throws once `timeoutMs` elapses. */
async function waitFor<T>(
  check: () => Promise<T | null | undefined | false>,
  timeoutMs = 20000,
  intervalMs = 250,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const result = await check();
    if (result) return result;
    if (Date.now() >= deadline) {
      throw new Error(`waitFor() timed out after ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

function fakeCommit(
  externalId: string,
  authorUsername: string,
  authorEmail: string,
  additions: number,
  deletions: number,
): ProviderCommit {
  return {
    externalId,
    hash: externalId.padEnd(40, '0'),
    message: `Fixture commit ${externalId}`,
    authorUsername,
    authorEmail,
    committedAt: new Date(),
    additions,
    deletions,
    changedFiles: 1,
    isMerge: false,
    branch: 'main',
  };
}

function fakeBotCommit(externalId: string): ProviderCommit {
  return {
    externalId,
    hash: externalId.padEnd(40, '0'),
    message: 'chore(deps): bump fixture dependency',
    authorUsername: 'dependabot[bot]',
    authorEmail: 'dependabot-bot@users.noreply.example.test',
    committedAt: new Date(),
    additions: 2,
    deletions: 2,
    changedFiles: 1,
    isMerge: false,
    branch: 'main',
  };
}

/**
 * Builds a fixture repository. `withActivity` repos carry three human commits
 * (plus one bot commit, to prove bot exclusion), one merged PR, one approving
 * review and one closed issue — all attributed to `authorUsername`/`authorEmail`
 * so the identity-matching pipeline (commit email -> org member) resolves them
 * to a real Devlytics user and they show up in developer/team metrics.
 */
function buildFixture(options: {
  fullName: string;
  externalId: string;
  authorUsername: string;
  authorEmail: string;
  withActivity: boolean;
}): FakeRepoFixture {
  const { fullName, externalId, authorUsername, authorEmail, withActivity } =
    options;
  const now = new Date();

  const pullRequests: ProviderPullRequest[] = withActivity
    ? [
        {
          externalId: `${externalId}-pr-1`,
          number: 1,
          title: 'Add fixture feature',
          authorUsername,
          sourceBranch: 'feature/fixture',
          targetBranch: 'main',
          status: 'MERGED',
          createdAt: now,
          mergedAt: now,
          additions: 40,
          deletions: 5,
          changedFiles: 3,
          commentCount: 2,
          url: `https://fake.example.test/${fullName}/pull/1`,
        },
      ]
    : [];

  const reviews: ProviderReview[] = withActivity
    ? [
        {
          externalId: `${externalId}-review-1`,
          pullRequestExternalId: `${externalId}-pr-1`,
          reviewerUsername: authorUsername,
          state: 'APPROVED',
          submittedAt: now,
        },
      ]
    : [];

  const issues: ProviderIssue[] = withActivity
    ? [
        {
          externalId: `${externalId}-issue-1`,
          number: 1,
          title: 'Fixture issue',
          creatorUsername: authorUsername,
          status: 'CLOSED',
          labels: [],
          createdAt: now,
          closedAt: now,
        },
      ]
    : [];

  return {
    externalId,
    fullName,
    name: fullName.split('/')[1],
    defaultBranch: 'main',
    visibility: 'PRIVATE',
    commits: withActivity
      ? [
          fakeCommit(`${externalId}-c1`, authorUsername, authorEmail, 40, 5),
          fakeCommit(`${externalId}-c2`, authorUsername, authorEmail, 12, 2),
          fakeCommit(`${externalId}-c3`, authorUsername, authorEmail, 8, 0),
          fakeBotCommit(`${externalId}-c-bot`),
        ]
      : [],
    pullRequests,
    reviews,
    issues,
  };
}

/**
 * Covers docs requirements §16 Testing Requirements E2E flow from "GitHub/
 * GitLab" onward: connect -> discover -> import -> sync -> ingested activity
 * -> developer/team metrics, plus the §16 Critical Security Test extended to
 * repositories, sync status and metrics (mirrors auth.e2e-spec.ts's tenant-
 * isolation pattern).
 *
 * Real GitHub/GitLab OAuth cannot run here, so `ProviderAdapterFactory` is
 * overridden with `FakeProviderAdapterFactory` — a test double at the same
 * `GitProviderAdapter` boundary the sync pipeline already uses for every
 * provider, so nothing about the sync/metrics pipeline itself is mocked.
 */
describe('Git provider connect -> sync -> activity -> metrics (e2e)', () => {
  let app: INestApplication;
  const stamp = Date.now();

  beforeAll(async () => {
    await resetDatabase();
    app = await createTestApp((builder) =>
      builder
        .overrideProvider(ProviderAdapterFactory)
        .useValue(new FakeProviderAdapterFactory()),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  async function registerOrg(email: string, orgName: string) {
    const response = await request(server())
      .post('/api/v1/auth/register')
      .send({
        email,
        firstName: 'Test',
        lastName: 'Admin',
        password: 'Str0ng!Passphrase',
        organization: { name: orgName },
      })
      .expect(201);
    return response.body.data as {
      accessToken: string;
      user: { id: string; email: string };
      organization: { id: string };
    };
  }

  async function connectGithub(token: string, accessToken: string) {
    const response = await request(server())
      .post('/api/v1/git/github/connect')
      .set('Authorization', `Bearer ${token}`)
      .send({ accessToken })
      .expect(201);
    return response.body.data.id as string;
  }

  async function importRepositories(
    token: string,
    providerId: string,
    repositories: { externalRepositoryId: string; fullName: string }[],
    startSync: boolean,
  ) {
    const response = await request(server())
      .post(`/api/v1/git/providers/${providerId}/import`)
      .set('Authorization', `Bearer ${token}`)
      .send({ repositories, startSync })
      .expect(201);
    return response.body.data as {
      imported: number;
      repositories: { id: string; fullName: string }[];
      syncJobs: { id: string; repositoryId: string; queued: boolean }[];
      note: string;
    };
  }

  async function triggerSync(token: string, repositoryId: string) {
    return request(server())
      .post(`/api/v1/repositories/${repositoryId}/sync`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
  }

  interface SyncProgress {
    total: number;
    completed: number;
    inProgress: number;
    scoresWithheld: boolean;
    repositories: {
      id: string;
      syncStatus: string;
      syncError: string | null;
    }[];
  }

  async function syncProgress(token: string): Promise<SyncProgress> {
    const response = await request(server())
      .get('/api/v1/sync/progress')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return response.body.data as SyncProgress;
  }

  async function waitForRepoSynced(token: string, repositoryId: string) {
    return waitFor(async () => {
      const progress = await syncProgress(token);
      const repo = progress.repositories.find((r) => r.id === repositoryId);
      if (repo?.syncStatus === 'FAILED') {
        throw new Error(
          `Sync failed for repository ${repositoryId}: ${repo.syncError}`,
        );
      }
      return repo?.syncStatus === 'SYNCED' ? progress : null;
    });
  }

  // --- Organization A: full happy-path pipeline -----------------------------

  const orgAAdminEmail = `gitsync-orga-${stamp}@example.test`;
  let tokenA: string;
  let orgAAdminUserId: string;
  let providerAId: string;
  let repoA1Id: string;
  let repoA2Id: string;

  const repoA1FullName = `orga-${stamp}/primary`;
  const repoA2FullName = `orga-${stamp}/secondary`;
  let teamId: string;

  it('registers Organization A and connects a GitHub provider', async () => {
    const admin = await registerOrg(orgAAdminEmail, `GitSync Org A ${stamp}`);
    tokenA = admin.accessToken;
    orgAAdminUserId = admin.user.id;

    FAKE_REPOS.set(
      repoA1FullName,
      buildFixture({
        fullName: repoA1FullName,
        externalId: `orga-${stamp}-repo-1`,
        authorUsername: `org-a-admin-${stamp}`,
        authorEmail: orgAAdminEmail,
        withActivity: true,
      }),
    );
    FAKE_REPOS.set(
      repoA2FullName,
      buildFixture({
        fullName: repoA2FullName,
        externalId: `orga-${stamp}-repo-2`,
        authorUsername: `org-a-admin-${stamp}`,
        authorEmail: orgAAdminEmail,
        withActivity: false,
      }),
    );

    providerAId = await connectGithub(tokenA, `fake-token-orga-${stamp}`);
    expect(providerAId).toEqual(expect.any(String));
  });

  it('discovers the fixture repositories before anything is imported', async () => {
    const response = await request(server())
      .get(`/api/v1/git/providers/${providerAId}/discover`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fullName: repoA1FullName,
          alreadyImported: false,
        }),
        expect.objectContaining({
          fullName: repoA2FullName,
          alreadyImported: false,
        }),
      ]),
    );
  });

  it('imports both repositories without starting collection yet', async () => {
    const result = await importRepositories(
      tokenA,
      providerAId,
      [
        {
          externalRepositoryId: `orga-${stamp}-repo-1`,
          fullName: repoA1FullName,
        },
        {
          externalRepositoryId: `orga-${stamp}-repo-2`,
          fullName: repoA2FullName,
        },
      ],
      false,
    );

    expect(result.imported).toBe(2);
    expect(result.syncJobs).toHaveLength(0);
    expect(result.note).toBe(
      'Repositories imported without starting collection.',
    );

    repoA1Id = result.repositories.find(
      (repo) => repo.fullName === repoA1FullName,
    )!.id;
    repoA2Id = result.repositories.find(
      (repo) => repo.fullName === repoA2FullName,
    )!.id;
    expect(repoA1Id).toEqual(expect.any(String));
    expect(repoA2Id).toEqual(expect.any(String));
  });

  it('creates a team and adds the admin as a member before any sync runs', async () => {
    // Team membership must exist *before* the sync pipeline rebuilds metrics
    // (metrics are a point-in-time rollup, not retroactively recomputed when
    // membership changes later), so this runs before the first sync trigger.
    const team = await request(server())
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'GitSync Team', code: `GITSYNC-${stamp}` })
      .expect(201);
    teamId = team.body.data.id as string;

    await request(server())
      .post(`/api/v1/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ userId: orgAAdminUserId })
      .expect(201);
  });

  it('syncs the first repository and ingests its commits, PRs, reviews and issues', async () => {
    await triggerSync(tokenA, repoA1Id);
    await waitForRepoSynced(tokenA, repoA1Id);

    const commits = await request(server())
      .get(`/api/v1/repositories/${repoA1Id}/commits`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(commits.body.pagination.total).toBe(3); // bot commit excluded by default

    const commitsWithBots = await request(server())
      .get(`/api/v1/repositories/${repoA1Id}/commits?includeBots=true`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(commitsWithBots.body.pagination.total).toBe(4);
    expect(commitsWithBots.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ isBot: true, author: null }),
      ]),
    );

    const pullRequests = await request(server())
      .get(`/api/v1/repositories/${repoA1Id}/pull-requests`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(pullRequests.body.pagination.total).toBe(1);
    expect(pullRequests.body.data[0]).toEqual(
      expect.objectContaining({ status: 'MERGED', number: 1 }),
    );
    expect(pullRequests.body.data[0].author?.id).toBe(orgAAdminUserId);

    const reviews = await request(server())
      .get(`/api/v1/repositories/${repoA1Id}/reviews`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(reviews.body.pagination.total).toBe(1);
    expect(reviews.body.data[0]).toEqual(
      expect.objectContaining({ state: 'APPROVED' }),
    );

    const issues = await request(server())
      .get(`/api/v1/repositories/${repoA1Id}/issues`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(issues.body.pagination.total).toBe(1);
    expect(issues.body.data[0]).toEqual(
      expect.objectContaining({ status: 'CLOSED' }),
    );
  });

  it('marks scores withheld while a sibling repository is still unsynced, and reflects activity in metrics', async () => {
    const progress = await syncProgress(tokenA);
    expect(progress.total).toBe(2);
    expect(progress.completed).toBe(1);
    expect(progress.scoresWithheld).toBe(true);

    const developers = await request(server())
      .get('/api/v1/metrics/developers')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const developerEntry = (
      developers.body.data as {
        user: { id: string };
        metrics: Record<string, number>;
      }[]
    ).find((entry) => entry.user.id === orgAAdminUserId);
    expect(developerEntry).toBeDefined();
    expect(developerEntry!.metrics).toEqual(
      expect.objectContaining({
        commits: 3,
        prsCreated: 1,
        prsMerged: 1,
        reviewsGiven: 1,
        issuesResolved: 1,
      }),
    );

    const teams = await request(server())
      .get('/api/v1/metrics/teams')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const teamEntry = (
      teams.body.data as {
        team: { id: string };
        metrics: Record<string, number>;
      }[]
    ).find((entry) => entry.team.id === teamId);
    expect(teamEntry).toBeDefined();
    expect(teamEntry!.metrics).toEqual(
      expect.objectContaining({
        commits: 3,
        prsCreated: 1,
        prsMerged: 1,
        reviewsGiven: 1,
        issuesResolved: 1,
      }),
    );
  });

  it('clears the partial-sync flag once every selected repository completes', async () => {
    await triggerSync(tokenA, repoA2Id);
    await waitForRepoSynced(tokenA, repoA2Id);

    const progress = await syncProgress(tokenA);
    expect(progress.total).toBe(2);
    expect(progress.completed).toBe(2);
    expect(progress.scoresWithheld).toBe(false);
  });

  // --- Organization B + cross-tenant isolation ------------------------------

  const orgBAdminEmail = `gitsync-orgb-${stamp}@example.test`;
  const repoBFullName = `orgb-${stamp}/primary`;
  let tokenB: string;
  let providerBId: string;
  let repoBId: string;

  it('registers Organization B, connects its own provider and auto-queues sync on import', async () => {
    const admin = await registerOrg(orgBAdminEmail, `GitSync Org B ${stamp}`);
    tokenB = admin.accessToken;

    FAKE_REPOS.set(
      repoBFullName,
      buildFixture({
        fullName: repoBFullName,
        externalId: `orgb-${stamp}-repo-1`,
        authorUsername: `org-b-admin-${stamp}`,
        authorEmail: orgBAdminEmail,
        withActivity: true,
      }),
    );

    providerBId = await connectGithub(tokenB, `fake-token-orgb-${stamp}`);

    const result = await importRepositories(
      tokenB,
      providerBId,
      [
        {
          externalRepositoryId: `orgb-${stamp}-repo-1`,
          fullName: repoBFullName,
        },
      ],
      true,
    );
    expect(result.syncJobs.length).toBeGreaterThan(0);
    expect(result.note).toContain('withheld');
    repoBId = result.repositories[0].id;

    await waitForRepoSynced(tokenB, repoBId);
  });

  it("never lets Organization B read, sync or measure Organization A's Git data (and vice versa)", async () => {
    // B reading/acting on A's repository resolves to 404, not the resource.
    await request(server())
      .get(`/api/v1/repositories/${repoA1Id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404)
      .expect((res) => expect(res.body.code).toBe('REPOSITORY_NOT_FOUND'));

    await request(server())
      .get(`/api/v1/repositories/${repoA1Id}/commits`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404)
      .expect((res) => expect(res.body.code).toBe('REPOSITORY_NOT_FOUND'));

    await request(server())
      .post(`/api/v1/repositories/${repoA1Id}/sync`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404)
      .expect((res) => expect(res.body.code).toBe('REPOSITORY_NOT_FOUND'));

    await request(server())
      .get(`/api/v1/git/providers/${providerAId}/discover`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404)
      .expect((res) => expect(res.body.code).toBe('GIT_PROVIDER_NOT_FOUND'));

    // Symmetric: A cannot reach B's repository or provider either.
    await request(server())
      .get(`/api/v1/repositories/${repoBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404)
      .expect((res) => expect(res.body.code).toBe('REPOSITORY_NOT_FOUND'));

    await request(server())
      .get(`/api/v1/git/providers/${providerBId}/discover`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404)
      .expect((res) => expect(res.body.code).toBe('GIT_PROVIDER_NOT_FOUND'));

    // Repository listings never leak the other organization's rows.
    const reposForA = await request(server())
      .get('/api/v1/repositories')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const idsForA = (reposForA.body.data as { id: string }[]).map((r) => r.id);
    expect(idsForA).toEqual(expect.arrayContaining([repoA1Id, repoA2Id]));
    expect(idsForA).not.toContain(repoBId);

    const reposForB = await request(server())
      .get('/api/v1/repositories')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    const idsForB = (reposForB.body.data as { id: string }[]).map((r) => r.id);
    expect(idsForB).toEqual(expect.arrayContaining([repoBId]));
    expect(idsForB).not.toContain(repoA1Id);
    expect(idsForB).not.toContain(repoA2Id);

    // Sync progress never mixes organizations.
    const progressForB = await syncProgress(tokenB);
    expect(progressForB.repositories.map((r) => r.id)).not.toContain(repoA1Id);

    // Metrics never leak another organization's developers.
    const developersForB = await request(server())
      .get('/api/v1/metrics/developers')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    const userIdsForB = (
      developersForB.body.data as { user: { id: string } }[]
    ).map((entry) => entry.user.id);
    expect(userIdsForB).not.toContain(orgAAdminUserId);
  });
});

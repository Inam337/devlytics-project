import { GitProviderType } from '@prisma/client';
import {
  CollectionWindow,
  GitProviderAdapter,
  ProviderAccount,
  ProviderCommit,
  ProviderDeployment,
  ProviderIssue,
  ProviderPipeline,
  ProviderPullRequest,
  ProviderRepository,
  ProviderReview,
  RepositoryRef,
} from './git-provider.adapter';
import { HttpProviderClient } from './http-provider.client';

/** Minimal shapes of the GitHub REST payloads this adapter reads. */
interface GhUser {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}
interface GhRepo {
  id: number;
  name: string;
  full_name: string;
  description?: string;
  html_url?: string;
  clone_url?: string;
  default_branch?: string;
  language?: string;
  private: boolean;
  visibility?: string;
  archived?: boolean;
}
interface GhCommitListItem {
  sha: string;
  html_url?: string;
  commit: {
    message: string;
    author?: { name?: string; email?: string; date?: string };
  };
  author?: { login?: string } | null;
  parents?: unknown[];
}
interface GhCommitDetail extends GhCommitListItem {
  stats?: { additions?: number; deletions?: number };
  files?: { filename: string; status: string; additions: number; deletions: number }[];
}
interface GhPull {
  id: number;
  number: number;
  title: string;
  body?: string;
  user?: { login?: string } | null;
  head?: { ref?: string };
  base?: { ref?: string };
  state: string;
  draft?: boolean;
  created_at: string;
  merged_at?: string | null;
  closed_at?: string | null;
  additions?: number;
  deletions?: number;
  changed_files?: number;
  comments?: number;
  html_url?: string;
}
interface GhReview {
  id: number;
  user?: { login?: string } | null;
  state: string;
  body?: string;
  submitted_at?: string;
}
interface GhIssue {
  id: number;
  number: number;
  title: string;
  body?: string;
  user?: { login?: string } | null;
  assignee?: { login?: string } | null;
  state: string;
  labels?: ({ name?: string } | string)[];
  created_at: string;
  closed_at?: string | null;
  html_url?: string;
  pull_request?: unknown;
}
interface GhWorkflowRun {
  id: number;
  name?: string;
  head_branch?: string;
  head_sha?: string;
  status: string;
  conclusion?: string | null;
  run_started_at?: string;
  updated_at?: string;
  html_url?: string;
}
interface GhDeployment {
  id: number;
  environment: string;
  sha?: string;
  created_at: string;
  url?: string;
}
interface GhDeploymentStatus {
  state: string;
}

/**
 * GitHub REST v3 adapter. Read-only: it never writes to the provider.
 */
export class GithubAdapter implements GitProviderAdapter {
  readonly providerType: GitProviderType = 'GITHUB';
  private readonly http: HttpProviderClient;

  constructor(baseUrl: string, token: string, timeoutMs?: number) {
    this.http = new HttpProviderClient(
      { baseUrl, token, authScheme: 'Bearer', timeoutMs },
      GithubAdapter.name,
    );
  }

  async getCurrentUser(): Promise<ProviderAccount> {
    const user = await this.http.get<GhUser>('/user');
    return {
      externalId: String(user.id),
      username: user.login,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatar_url,
    };
  }

  async getRepositories(): Promise<ProviderRepository[]> {
    const repos = await this.http.getPaged<GhRepo>('/user/repos', {
      affiliation: 'owner,organization_member',
      sort: 'updated',
    });
    return repos.map(toRepository);
  }

  async getRepository(ref: RepositoryRef): Promise<ProviderRepository> {
    return toRepository(await this.http.get<GhRepo>(`/repos/${ref.fullName}`));
  }

  async getCommits(ref: RepositoryRef, window: CollectionWindow): Promise<ProviderCommit[]> {
    const list = await this.http.getPaged<GhCommitListItem>(
      `/repos/${ref.fullName}/commits`,
      { since: window.since.toISOString(), until: window.until?.toISOString() },
      100,
      window.maxPages ?? 10,
    );

    // The list endpoint omits per-commit stats, so detail is fetched per commit.
    const detailed: ProviderCommit[] = [];
    for (const item of list) {
      let detail: GhCommitDetail = item;
      try {
        detail = await this.http.get<GhCommitDetail>(`/repos/${ref.fullName}/commits/${item.sha}`);
      } catch {
        // Fall back to list data rather than dropping the commit entirely.
      }
      detailed.push({
        externalId: detail.sha,
        hash: detail.sha,
        message: detail.commit.message ?? '',
        authorName: detail.commit.author?.name,
        authorEmail: detail.commit.author?.email,
        authorUsername: detail.author?.login ?? undefined,
        committedAt: new Date(detail.commit.author?.date ?? Date.now()),
        additions: detail.stats?.additions ?? 0,
        deletions: detail.stats?.deletions ?? 0,
        changedFiles: detail.files?.length ?? 0,
        isMerge: (detail.parents?.length ?? 0) > 1,
        url: detail.html_url,
        files: detail.files?.map((file) => ({
          path: file.filename,
          changeType: file.status,
          additions: file.additions,
          deletions: file.deletions,
        })),
      });
    }
    return detailed;
  }

  async getPullRequests(
    ref: RepositoryRef,
    window: CollectionWindow,
  ): Promise<ProviderPullRequest[]> {
    const pulls = await this.http.getPaged<GhPull>(
      `/repos/${ref.fullName}/pulls`,
      { state: 'all', sort: 'updated', direction: 'desc' },
      100,
      window.maxPages ?? 5,
    );

    return pulls
      .filter((pull) => new Date(pull.created_at) >= window.since)
      .map((pull) => ({
        externalId: String(pull.id),
        number: pull.number,
        title: pull.title,
        description: pull.body ?? undefined,
        authorUsername: pull.user?.login ?? undefined,
        sourceBranch: pull.head?.ref,
        targetBranch: pull.base?.ref,
        status: pull.merged_at
          ? ('MERGED' as const)
          : pull.draft
            ? ('DRAFT' as const)
            : pull.state === 'closed'
              ? ('CLOSED' as const)
              : ('OPEN' as const),
        createdAt: new Date(pull.created_at),
        mergedAt: pull.merged_at ? new Date(pull.merged_at) : undefined,
        closedAt: pull.closed_at ? new Date(pull.closed_at) : undefined,
        additions: pull.additions ?? 0,
        deletions: pull.deletions ?? 0,
        changedFiles: pull.changed_files ?? 0,
        commentCount: pull.comments ?? 0,
        url: pull.html_url,
      }));
  }

  async getReviews(ref: RepositoryRef, pullRequestNumbers: number[]): Promise<ProviderReview[]> {
    const reviews: ProviderReview[] = [];
    for (const number of pullRequestNumbers) {
      const batch = await this.http.getPaged<GhReview>(
        `/repos/${ref.fullName}/pulls/${number}/reviews`,
        {},
        100,
        2,
      );
      const pull = await this.http.get<GhPull>(`/repos/${ref.fullName}/pulls/${number}`);
      for (const review of batch) {
        reviews.push({
          externalId: String(review.id),
          pullRequestExternalId: String(pull.id),
          reviewerUsername: review.user?.login ?? undefined,
          state: mapReviewState(review.state),
          body: review.body,
          submittedAt: new Date(review.submitted_at ?? Date.now()),
        });
      }
    }
    return reviews;
  }

  async getIssues(ref: RepositoryRef, window: CollectionWindow): Promise<ProviderIssue[]> {
    const issues = await this.http.getPaged<GhIssue>(
      `/repos/${ref.fullName}/issues`,
      { state: 'all', since: window.since.toISOString() },
      100,
      window.maxPages ?? 5,
    );

    // GitHub returns pull requests from the issues endpoint; they are collected separately.
    return issues
      .filter((issue) => !issue.pull_request)
      .map((issue) => ({
        externalId: String(issue.id),
        number: issue.number,
        title: issue.title,
        description: issue.body ?? undefined,
        creatorUsername: issue.user?.login ?? undefined,
        assigneeUsername: issue.assignee?.login ?? undefined,
        status: issue.state === 'closed' ? ('CLOSED' as const) : ('OPEN' as const),
        labels: (issue.labels ?? [])
          .map((label) => (typeof label === 'string' ? label : (label.name ?? '')))
          .filter(Boolean),
        createdAt: new Date(issue.created_at),
        closedAt: issue.closed_at ? new Date(issue.closed_at) : undefined,
        url: issue.html_url,
      }));
  }

  async getPipelines(ref: RepositoryRef, window: CollectionWindow): Promise<ProviderPipeline[]> {
    const payload = await this.http.get<{ workflow_runs?: GhWorkflowRun[] }>(
      `/repos/${ref.fullName}/actions/runs`,
      { per_page: 100, created: `>=${window.since.toISOString().slice(0, 10)}` },
    );

    return (payload.workflow_runs ?? []).map((run) => {
      const startedAt = run.run_started_at ? new Date(run.run_started_at) : undefined;
      const finishedAt = run.updated_at ? new Date(run.updated_at) : undefined;
      return {
        externalId: String(run.id),
        name: run.name,
        branch: run.head_branch,
        commitHash: run.head_sha,
        status: mapPipelineStatus(run.status, run.conclusion),
        startedAt,
        finishedAt,
        durationSeconds:
          startedAt && finishedAt
            ? Math.max(0, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000))
            : undefined,
        url: run.html_url,
      };
    });
  }

  async getDeployments(
    ref: RepositoryRef,
    window: CollectionWindow,
  ): Promise<ProviderDeployment[]> {
    const deployments = await this.http.getPaged<GhDeployment>(
      `/repos/${ref.fullName}/deployments`,
      {},
      100,
      window.maxPages ?? 2,
    );

    const results: ProviderDeployment[] = [];
    for (const deployment of deployments) {
      if (new Date(deployment.created_at) < window.since) continue;
      let state = 'in_progress';
      try {
        const statuses = await this.http.get<GhDeploymentStatus[]>(
          `/repos/${ref.fullName}/deployments/${deployment.id}/statuses`,
          { per_page: 1 },
        );
        state = statuses[0]?.state ?? state;
      } catch {
        // Keep the deployment with an in-progress status rather than dropping it.
      }
      results.push({
        externalId: String(deployment.id),
        environment: deployment.environment ?? 'production',
        status: mapDeploymentStatus(state),
        commitHash: deployment.sha,
        deployedAt: new Date(deployment.created_at),
        url: deployment.url,
      });
    }
    return results;
  }
}

function toRepository(repo: GhRepo): ProviderRepository {
  return {
    externalId: String(repo.id),
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description ?? undefined,
    url: repo.html_url,
    cloneUrl: repo.clone_url,
    defaultBranch: repo.default_branch ?? 'main',
    language: repo.language ?? undefined,
    visibility:
      repo.visibility === 'internal' ? 'INTERNAL' : repo.private ? 'PRIVATE' : 'PUBLIC',
    isArchived: Boolean(repo.archived),
  };
}

function mapReviewState(state: string): ProviderReview['state'] {
  switch (state?.toUpperCase()) {
    case 'APPROVED':
      return 'APPROVED';
    case 'CHANGES_REQUESTED':
      return 'CHANGES_REQUESTED';
    case 'DISMISSED':
      return 'DISMISSED';
    case 'PENDING':
      return 'PENDING';
    default:
      return 'COMMENTED';
  }
}

function mapPipelineStatus(status: string, conclusion?: string | null): ProviderPipeline['status'] {
  if (status === 'queued' || status === 'waiting') return 'QUEUED';
  if (status === 'in_progress') return 'RUNNING';
  switch (conclusion) {
    case 'success':
      return 'SUCCESS';
    case 'failure':
    case 'timed_out':
      return 'FAILED';
    case 'cancelled':
      return 'CANCELED';
    case 'skipped':
      return 'SKIPPED';
    default:
      return 'RUNNING';
  }
}

function mapDeploymentStatus(state: string): ProviderDeployment['status'] {
  switch (state) {
    case 'success':
      return 'SUCCESS';
    case 'failure':
    case 'error':
      return 'FAILED';
    case 'inactive':
      return 'ROLLED_BACK';
    default:
      return 'IN_PROGRESS';
  }
}

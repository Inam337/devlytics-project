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

/** Minimal shapes of the GitLab REST v4 payloads this adapter reads. */
interface GlUser {
  id: number;
  username: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}
interface GlProject {
  id: number;
  name: string;
  path_with_namespace: string;
  description?: string;
  web_url?: string;
  http_url_to_repo?: string;
  default_branch?: string;
  visibility?: string;
  archived?: boolean;
}
interface GlCommit {
  id: string;
  short_id?: string;
  title?: string;
  message?: string;
  author_name?: string;
  author_email?: string;
  committed_date?: string;
  created_at?: string;
  parent_ids?: string[];
  web_url?: string;
  stats?: { additions?: number; deletions?: number; total?: number };
}
interface GlCommitDiff {
  new_path?: string;
  old_path?: string;
  new_file?: boolean;
  deleted_file?: boolean;
  renamed_file?: boolean;
  diff?: string;
}
interface GlMergeRequest {
  id: number;
  iid: number;
  title: string;
  description?: string;
  author?: { username?: string };
  source_branch?: string;
  target_branch?: string;
  state: string;
  draft?: boolean;
  work_in_progress?: boolean;
  created_at: string;
  merged_at?: string | null;
  closed_at?: string | null;
  user_notes_count?: number;
  changes_count?: string;
  web_url?: string;
}
interface GlApproval {
  user?: { username?: string };
  created_at?: string;
}
interface GlNote {
  id: number;
  author?: { username?: string };
  body?: string;
  created_at: string;
  system?: boolean;
}
interface GlIssue {
  id: number;
  iid: number;
  title: string;
  description?: string;
  author?: { username?: string };
  assignee?: { username?: string };
  state: string;
  labels?: string[];
  created_at: string;
  closed_at?: string | null;
  web_url?: string;
}
interface GlPipeline {
  id: number;
  ref?: string;
  sha?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  duration?: number;
  web_url?: string;
}
interface GlDeployment {
  id: number;
  environment?: { name?: string };
  status: string;
  sha?: string;
  created_at: string;
  deployable?: { commit?: { id?: string } };
}

/**
 * GitLab REST v4 adapter. GitLab has no direct equivalent of a GitHub review,
 * so approvals and non-system merge-request notes are normalised into reviews.
 */
export class GitlabAdapter implements GitProviderAdapter {
  readonly providerType: GitProviderType = 'GITLAB';
  private readonly http: HttpProviderClient;

  constructor(baseUrl: string, token: string, timeoutMs?: number) {
    this.http = new HttpProviderClient(
      { baseUrl, token, authScheme: 'PRIVATE-TOKEN', timeoutMs },
      GitlabAdapter.name,
    );
  }

  async getCurrentUser(): Promise<ProviderAccount> {
    const user = await this.http.get<GlUser>('/user');
    return {
      externalId: String(user.id),
      username: user.username,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatar_url,
    };
  }

  async getRepositories(): Promise<ProviderRepository[]> {
    const projects = await this.http.getPaged<GlProject>('/projects', {
      membership: 'true',
      order_by: 'last_activity_at',
    });
    return projects.map(toRepository);
  }

  async getRepository(ref: RepositoryRef): Promise<ProviderRepository> {
    return toRepository(
      await this.http.get<GlProject>(`/projects/${ref.externalId}`),
    );
  }

  async getCommits(
    ref: RepositoryRef,
    window: CollectionWindow,
  ): Promise<ProviderCommit[]> {
    const commits = await this.http.getPaged<GlCommit>(
      `/projects/${ref.externalId}/repository/commits`,
      {
        since: window.since.toISOString(),
        until: window.until?.toISOString(),
        with_stats: 'true',
      },
      100,
      window.maxPages ?? 10,
    );

    const results: ProviderCommit[] = [];
    for (const commit of commits) {
      let files: ProviderCommit['files'];
      try {
        const diffs = await this.http.get<GlCommitDiff[]>(
          `/projects/${ref.externalId}/repository/commits/${commit.id}/diff`,
        );
        files = diffs.map((diff) => ({
          path: diff.new_path ?? diff.old_path ?? 'unknown',
          changeType: diff.new_file
            ? 'added'
            : diff.deleted_file
              ? 'removed'
              : diff.renamed_file
                ? 'renamed'
                : 'modified',
          ...countDiffLines(diff.diff),
        }));
      } catch {
        files = undefined;
      }

      results.push({
        externalId: commit.id,
        hash: commit.id,
        message: commit.message ?? commit.title ?? '',
        authorName: commit.author_name,
        authorEmail: commit.author_email,
        committedAt: new Date(
          commit.committed_date ?? commit.created_at ?? Date.now(),
        ),
        additions: commit.stats?.additions ?? 0,
        deletions: commit.stats?.deletions ?? 0,
        changedFiles: files?.length ?? 0,
        isMerge: (commit.parent_ids?.length ?? 0) > 1,
        url: commit.web_url,
        files,
      });
    }
    return results;
  }

  async getPullRequests(
    ref: RepositoryRef,
    window: CollectionWindow,
  ): Promise<ProviderPullRequest[]> {
    const merges = await this.http.getPaged<GlMergeRequest>(
      `/projects/${ref.externalId}/merge_requests`,
      {
        state: 'all',
        created_after: window.since.toISOString(),
        order_by: 'updated_at',
      },
      100,
      window.maxPages ?? 5,
    );

    return merges.map((merge) => ({
      externalId: String(merge.id),
      number: merge.iid,
      title: merge.title,
      description: merge.description ?? undefined,
      authorUsername: merge.author?.username,
      sourceBranch: merge.source_branch,
      targetBranch: merge.target_branch,
      status:
        merge.state === 'merged'
          ? ('MERGED' as const)
          : merge.draft || merge.work_in_progress
            ? ('DRAFT' as const)
            : merge.state === 'closed'
              ? ('CLOSED' as const)
              : ('OPEN' as const),
      createdAt: new Date(merge.created_at),
      mergedAt: merge.merged_at ? new Date(merge.merged_at) : undefined,
      closedAt: merge.closed_at ? new Date(merge.closed_at) : undefined,
      additions: 0,
      deletions: 0,
      changedFiles: Number.parseInt(merge.changes_count ?? '0', 10) || 0,
      commentCount: merge.user_notes_count ?? 0,
      url: merge.web_url,
    }));
  }

  async getReviews(
    ref: RepositoryRef,
    pullRequestNumbers: number[],
  ): Promise<ProviderReview[]> {
    const reviews: ProviderReview[] = [];

    for (const iid of pullRequestNumbers) {
      const merge = await this.http.get<GlMergeRequest>(
        `/projects/${ref.externalId}/merge_requests/${iid}`,
      );

      try {
        const approvals = await this.http.get<{ approved_by?: GlApproval[] }>(
          `/projects/${ref.externalId}/merge_requests/${iid}/approvals`,
        );
        for (const approval of approvals.approved_by ?? []) {
          reviews.push({
            externalId: `approval-${merge.id}-${approval.user?.username ?? 'unknown'}`,
            pullRequestExternalId: String(merge.id),
            reviewerUsername: approval.user?.username,
            state: 'APPROVED',
            submittedAt: new Date(approval.created_at ?? merge.created_at),
          });
        }
      } catch {
        // Approvals are a premium feature; notes below still capture review effort.
      }

      const notes = await this.http.getPaged<GlNote>(
        `/projects/${ref.externalId}/merge_requests/${iid}/notes`,
        {},
        100,
        2,
      );
      for (const note of notes) {
        if (note.system) continue;
        reviews.push({
          externalId: `note-${note.id}`,
          pullRequestExternalId: String(merge.id),
          reviewerUsername: note.author?.username,
          state: 'COMMENTED',
          body: note.body,
          submittedAt: new Date(note.created_at),
        });
      }
    }

    return reviews;
  }

  async getIssues(
    ref: RepositoryRef,
    window: CollectionWindow,
  ): Promise<ProviderIssue[]> {
    const issues = await this.http.getPaged<GlIssue>(
      `/projects/${ref.externalId}/issues`,
      { created_after: window.since.toISOString(), scope: 'all' },
      100,
      window.maxPages ?? 5,
    );

    return issues.map((issue) => ({
      externalId: String(issue.id),
      number: issue.iid,
      title: issue.title,
      description: issue.description ?? undefined,
      creatorUsername: issue.author?.username,
      assigneeUsername: issue.assignee?.username,
      status:
        issue.state === 'closed' ? ('CLOSED' as const) : ('OPEN' as const),
      labels: issue.labels ?? [],
      createdAt: new Date(issue.created_at),
      closedAt: issue.closed_at ? new Date(issue.closed_at) : undefined,
      url: issue.web_url,
    }));
  }

  async getPipelines(
    ref: RepositoryRef,
    window: CollectionWindow,
  ): Promise<ProviderPipeline[]> {
    const pipelines = await this.http.getPaged<GlPipeline>(
      `/projects/${ref.externalId}/pipelines`,
      { updated_after: window.since.toISOString() },
      100,
      window.maxPages ?? 3,
    );

    return pipelines.map((pipeline) => ({
      externalId: String(pipeline.id),
      name: `Pipeline #${pipeline.id}`,
      branch: pipeline.ref,
      commitHash: pipeline.sha,
      status: mapPipelineStatus(pipeline.status),
      startedAt: pipeline.created_at
        ? new Date(pipeline.created_at)
        : undefined,
      finishedAt: pipeline.updated_at
        ? new Date(pipeline.updated_at)
        : undefined,
      durationSeconds: pipeline.duration ?? undefined,
      url: pipeline.web_url,
    }));
  }

  async getDeployments(
    ref: RepositoryRef,
    window: CollectionWindow,
  ): Promise<ProviderDeployment[]> {
    const deployments = await this.http.getPaged<GlDeployment>(
      `/projects/${ref.externalId}/deployments`,
      {
        updated_after: window.since.toISOString(),
        order_by: 'created_at',
        sort: 'desc',
      },
      100,
      window.maxPages ?? 2,
    );

    return deployments.map((deployment) => ({
      externalId: String(deployment.id),
      environment: deployment.environment?.name ?? 'production',
      status: mapDeploymentStatus(deployment.status),
      commitHash: deployment.sha ?? deployment.deployable?.commit?.id,
      deployedAt: new Date(deployment.created_at),
    }));
  }
}

function toRepository(project: GlProject): ProviderRepository {
  return {
    externalId: String(project.id),
    name: project.name,
    fullName: project.path_with_namespace,
    description: project.description ?? undefined,
    url: project.web_url,
    cloneUrl: project.http_url_to_repo,
    defaultBranch: project.default_branch ?? 'main',
    visibility:
      project.visibility === 'public'
        ? 'PUBLIC'
        : project.visibility === 'internal'
          ? 'INTERNAL'
          : 'PRIVATE',
    isArchived: Boolean(project.archived),
  };
}

/** GitLab returns a unified diff rather than counts, so lines are tallied here. */
function countDiffLines(diff?: string): {
  additions: number;
  deletions: number;
} {
  if (!diff) return { additions: 0, deletions: 0 };
  let additions = 0;
  let deletions = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) additions += 1;
    else if (line.startsWith('-') && !line.startsWith('---')) deletions += 1;
  }
  return { additions, deletions };
}

function mapPipelineStatus(status: string): ProviderPipeline['status'] {
  switch (status) {
    case 'success':
      return 'SUCCESS';
    case 'failed':
      return 'FAILED';
    case 'canceled':
      return 'CANCELED';
    case 'skipped':
      return 'SKIPPED';
    case 'running':
      return 'RUNNING';
    default:
      return 'QUEUED';
  }
}

function mapDeploymentStatus(status: string): ProviderDeployment['status'] {
  switch (status) {
    case 'success':
      return 'SUCCESS';
    case 'failed':
      return 'FAILED';
    case 'canceled':
      return 'ROLLED_BACK';
    default:
      return 'IN_PROGRESS';
  }
}

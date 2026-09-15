import { GitProviderType } from '@prisma/client';

/**
 * Provider-neutral shapes. GitHub and GitLab payloads are normalised into these
 * before they reach any service, so no provider-specific field name appears
 * outside an adapter.
 */
export interface ProviderAccount {
  externalId: string;
  username: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
}

export interface ProviderRepository {
  externalId: string;
  name: string;
  fullName: string;
  description?: string;
  url?: string;
  cloneUrl?: string;
  defaultBranch: string;
  language?: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'INTERNAL';
  isArchived: boolean;
}

export interface ProviderCommit {
  externalId: string;
  hash: string;
  message: string;
  authorName?: string;
  authorEmail?: string;
  authorUsername?: string;
  committedAt: Date;
  additions: number;
  deletions: number;
  changedFiles: number;
  isMerge: boolean;
  branch?: string;
  url?: string;
  files?: ProviderCommitFile[];
}

export interface ProviderCommitFile {
  path: string;
  changeType: string;
  additions: number;
  deletions: number;
}

export interface ProviderPullRequest {
  externalId: string;
  number: number;
  title: string;
  description?: string;
  authorUsername?: string;
  sourceBranch?: string;
  targetBranch?: string;
  status: 'DRAFT' | 'OPEN' | 'MERGED' | 'CLOSED';
  createdAt: Date;
  mergedAt?: Date;
  closedAt?: Date;
  additions: number;
  deletions: number;
  changedFiles: number;
  commentCount: number;
  url?: string;
}

export interface ProviderReview {
  externalId: string;
  pullRequestExternalId: string;
  reviewerUsername?: string;
  state: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';
  body?: string;
  submittedAt: Date;
}

export interface ProviderIssue {
  externalId: string;
  number: number;
  title: string;
  description?: string;
  creatorUsername?: string;
  assigneeUsername?: string;
  status: 'OPEN' | 'CLOSED';
  labels: string[];
  createdAt: Date;
  closedAt?: Date;
  url?: string;
}

export interface ProviderPipeline {
  externalId: string;
  name?: string;
  branch?: string;
  commitHash?: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELED' | 'SKIPPED';
  startedAt?: Date;
  finishedAt?: Date;
  durationSeconds?: number;
  url?: string;
}

export interface ProviderDeployment {
  externalId: string;
  environment: string;
  status: 'IN_PROGRESS' | 'SUCCESS' | 'FAILED' | 'ROLLED_BACK';
  commitHash?: string;
  deployedAt: Date;
  url?: string;
}

export interface RepositoryRef {
  /** `owner/name` for GitHub, the numeric project id for GitLab. */
  fullName: string;
  externalId: string;
}

export interface CollectionWindow {
  since: Date;
  until?: Date;
  /** Hard cap so a first import of a very large repository stays bounded. */
  maxPages?: number;
}

/**
 * Contract every Git provider implements. Adding a provider means adding an
 * adapter — no service or controller changes.
 */
export interface GitProviderAdapter {
  readonly providerType: GitProviderType;

  getCurrentUser(): Promise<ProviderAccount>;
  getRepositories(): Promise<ProviderRepository[]>;
  getRepository(ref: RepositoryRef): Promise<ProviderRepository>;
  getCommits(ref: RepositoryRef, window: CollectionWindow): Promise<ProviderCommit[]>;
  getPullRequests(ref: RepositoryRef, window: CollectionWindow): Promise<ProviderPullRequest[]>;
  getReviews(ref: RepositoryRef, pullRequestNumbers: number[]): Promise<ProviderReview[]>;
  getIssues(ref: RepositoryRef, window: CollectionWindow): Promise<ProviderIssue[]>;
  getPipelines(ref: RepositoryRef, window: CollectionWindow): Promise<ProviderPipeline[]>;
  getDeployments(ref: RepositoryRef, window: CollectionWindow): Promise<ProviderDeployment[]>;
}

/** Raised when a provider rejects a call; carries enough to set provider status. */
export class ProviderRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly rateLimited = false,
    readonly tokenExpired = false,
  ) {
    super(message);
    this.name = 'ProviderRequestError';
  }
}

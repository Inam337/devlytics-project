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
  ProviderRequestError,
  ProviderReview,
  RepositoryRef,
} from '../../src/git/providers/git-provider.adapter';

/**
 * Test double for `GitProviderAdapter` (the boundary the git sync pipeline
 * already isolates provider-specific HTTP calls behind — see
 * `ProviderAdapterFactory`). Real GitHub/GitLab OAuth cannot run in CI, so
 * `git-sync-metrics.e2e-spec.ts` overrides `ProviderAdapterFactory` with
 * `FakeProviderAdapterFactory` and drives the whole
 * connect → discover → import → sync → ingest → metrics pipeline against
 * canned, in-memory fixtures instead of a live provider.
 */
export interface FakeRepoFixture {
  externalId: string;
  fullName: string;
  name: string;
  defaultBranch: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'INTERNAL';
  commits: ProviderCommit[];
  pullRequests: ProviderPullRequest[];
  reviews: ProviderReview[];
  issues: ProviderIssue[];
}

/** Shared in-memory registry: `fullName` -> fixture. Reset per test file/process. */
export const FAKE_REPOS = new Map<string, FakeRepoFixture>();

function toProviderRepository(fixture: FakeRepoFixture): ProviderRepository {
  return {
    externalId: fixture.externalId,
    name: fixture.name,
    fullName: fixture.fullName,
    description: 'Fixture repository for e2e testing',
    url: `https://fake.example.test/${fixture.fullName}`,
    cloneUrl: `https://fake.example.test/${fixture.fullName}.git`,
    defaultBranch: fixture.defaultBranch,
    language: 'TypeScript',
    visibility: fixture.visibility,
    isArchived: false,
  };
}

class FakeGitProviderAdapter implements GitProviderAdapter {
  readonly providerType: GitProviderType;

  constructor(
    providerType: GitProviderType,
    private readonly identitySeed: string,
  ) {
    this.providerType = providerType;
  }

  async getCurrentUser(): Promise<ProviderAccount> {
    return {
      externalId: `fake-account-${this.identitySeed}`,
      username: `fake-account-${this.identitySeed}`,
      name: 'Fake Provider Account',
    };
  }

  async getRepositories(): Promise<ProviderRepository[]> {
    return Array.from(FAKE_REPOS.values()).map(toProviderRepository);
  }

  async getRepository(ref: RepositoryRef): Promise<ProviderRepository> {
    const fixture = FAKE_REPOS.get(ref.fullName);
    if (!fixture) {
      throw new ProviderRequestError(
        `Fixture repository '${ref.fullName}' was never registered`,
        404,
      );
    }
    return toProviderRepository(fixture);
  }

  async getCommits(
    ref: RepositoryRef,
    _window: CollectionWindow,
  ): Promise<ProviderCommit[]> {
    void _window;
    return FAKE_REPOS.get(ref.fullName)?.commits ?? [];
  }

  async getPullRequests(
    ref: RepositoryRef,
    _window: CollectionWindow,
  ): Promise<ProviderPullRequest[]> {
    void _window;
    return FAKE_REPOS.get(ref.fullName)?.pullRequests ?? [];
  }

  async getReviews(
    ref: RepositoryRef,
    _pullRequestNumbers: number[],
  ): Promise<ProviderReview[]> {
    void _pullRequestNumbers;
    return FAKE_REPOS.get(ref.fullName)?.reviews ?? [];
  }

  async getIssues(
    ref: RepositoryRef,
    _window: CollectionWindow,
  ): Promise<ProviderIssue[]> {
    void _window;
    return FAKE_REPOS.get(ref.fullName)?.issues ?? [];
  }

  async getPipelines(
    _ref: RepositoryRef,
    _window: CollectionWindow,
  ): Promise<ProviderPipeline[]> {
    void _ref;
    void _window;
    return [];
  }

  async getDeployments(
    _ref: RepositoryRef,
    _window: CollectionWindow,
  ): Promise<ProviderDeployment[]> {
    void _ref;
    void _window;
    return [];
  }
}

/**
 * Drop-in replacement for `ProviderAdapterFactory`. Only the methods actually
 * called by `GitProvidersService`, `RepositoryImportService` and
 * `CollectorService` are implemented — no token decryption or HTTP client is
 * ever constructed.
 */
export class FakeProviderAdapterFactory {
  create(provider: { id: string; providerType: GitProviderType }) {
    return new FakeGitProviderAdapter(provider.providerType, provider.id);
  }

  createForToken(providerType: GitProviderType, token: string) {
    return new FakeGitProviderAdapter(providerType, token);
  }

  defaultBaseUrl(): string {
    return 'https://fake.example.test/api';
  }
}

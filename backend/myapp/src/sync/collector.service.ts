import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Repository, SyncJobType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  CollectionWindow,
  GitProviderAdapter,
  ProviderCommit,
  ProviderRequestError,
  RepositoryRef,
} from '../git/providers/git-provider.adapter';
import { GitProvidersService } from '../git/providers/git-providers.service';
import { ProviderAdapterFactory } from '../git/providers/provider-adapter.factory';
import { GitAccountsService } from '../git/accounts/git-accounts.service';

export interface CollectionResult {
  commits: number;
  pullRequests: number;
  reviews: number;
  issues: number;
  pipelines: number;
  deployments: number;
  identities: number;
  total: number;
}

/** File-path heuristics used to classify test and documentation changes. */
const TEST_PATH = /(^|\/)(tests?|__tests__|spec|e2e)(\/|$)|\.(test|spec)\.[a-z]+$/i;
const DOC_PATH = /(^|\/)(docs?|documentation)(\/|$)|\.(md|mdx|rst|adoc)$/i;

/**
 * Sync pipeline stages 2–3: collects engineering activity from a provider and
 * persists it, resolving each Git identity as it goes.
 *
 * Every write is an upsert keyed on the provider's external id, which makes the
 * whole collection idempotent — replaying a job never duplicates a commit.
 */
@Injectable()
export class CollectorService {
  private readonly logger = new Logger(CollectorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapters: ProviderAdapterFactory,
    private readonly providers: GitProvidersService,
    private readonly identities: GitAccountsService,
    private readonly config: ConfigService,
  ) {}

  async collect(
    repositoryId: string,
    jobType: SyncJobType,
    onProgress?: (processed: number, total: number) => Promise<void>,
  ): Promise<CollectionResult> {
    const repository = await this.prisma.repository.findUniqueOrThrow({
      where: { id: repositoryId },
      include: { provider: true },
    });

    const adapter = this.adapters.create(repository.provider);
    const ref: RepositoryRef = {
      fullName: repository.fullName,
      externalId: repository.externalRepositoryId,
    };
    const window = this.window(repository, jobType);

    await this.prisma.repository.update({
      where: { id: repositoryId },
      data: { syncStatus: 'SYNCING', syncError: null },
    });

    try {
      const result = await this.collectAll(repository, adapter, ref, window, onProgress);

      await this.prisma.repository.update({
        where: { id: repositoryId },
        data: { syncStatus: 'SYNCED', lastSyncAt: new Date(), syncError: null },
      });
      await this.providers.markSynced(repository.providerId);

      return result;
    } catch (error) {
      const providerError =
        error instanceof ProviderRequestError
          ? error
          : new ProviderRequestError((error as Error).message, 500);

      await this.providers.recordFailure(repository.providerId, providerError);

      // Rate limiting is a partial result, not a failure: the last good values
      // are retained and the repository is flagged rather than zeroed.
      await this.prisma.repository.update({
        where: { id: repositoryId },
        data: {
          syncStatus: providerError.rateLimited ? 'PARTIAL' : 'FAILED',
          syncError: providerError.message.slice(0, 1000),
        },
      });

      throw providerError;
    }
  }

  private async collectAll(
    repository: Repository,
    adapter: GitProviderAdapter,
    ref: RepositoryRef,
    window: CollectionWindow,
    onProgress?: (processed: number, total: number) => Promise<void>,
  ): Promise<CollectionResult> {
    const organizationId = repository.organizationId;
    const result: CollectionResult = {
      commits: 0,
      pullRequests: 0,
      reviews: 0,
      issues: 0,
      pipelines: 0,
      deployments: 0,
      identities: 0,
      total: 0,
    };

    // --- commits ------------------------------------------------------------
    const commits = await adapter.getCommits(ref, window);
    for (const [index, commit] of commits.entries()) {
      const identity = await this.identities.resolve({
        organizationId,
        providerId: repository.providerId,
        username: commit.authorUsername ?? commit.authorName,
        email: commit.authorEmail,
      });
      if (identity.userId || identity.isBot) result.identities += 1;

      await this.persistCommit(repository, commit, identity);
      result.commits += 1;

      if (onProgress && index % 25 === 0) await onProgress(index, commits.length);
    }

    // --- pull requests ------------------------------------------------------
    const pulls = await adapter.getPullRequests(ref, window);
    const numbersForReviews: number[] = [];

    for (const pull of pulls) {
      const identity = await this.identities.resolve({
        organizationId,
        providerId: repository.providerId,
        username: pull.authorUsername,
      });

      await this.prisma.pullRequest.upsert({
        where: {
          repositoryId_externalPrId: {
            repositoryId: repository.id,
            externalPrId: pull.externalId,
          },
        },
        update: {
          title: pull.title,
          description: pull.description,
          status: pull.status,
          mergedAt: pull.mergedAt,
          closedAt: pull.closedAt,
          additions: pull.additions,
          deletions: pull.deletions,
          changedFiles: pull.changedFiles,
          commentCount: pull.commentCount,
          authorId: identity.userId,
        },
        create: {
          organizationId,
          repositoryId: repository.id,
          authorId: identity.userId,
          externalPrId: pull.externalId,
          number: pull.number,
          title: pull.title,
          description: pull.description,
          sourceBranch: pull.sourceBranch,
          targetBranch: pull.targetBranch,
          status: pull.status,
          createdAtExternal: pull.createdAt,
          mergedAt: pull.mergedAt,
          closedAt: pull.closedAt,
          additions: pull.additions,
          deletions: pull.deletions,
          changedFiles: pull.changedFiles,
          commentCount: pull.commentCount,
          url: pull.url,
          metadata: { authorUsername: pull.authorUsername } as Prisma.InputJsonValue,
        },
      });

      result.pullRequests += 1;
      // Reviews are expensive to fetch, so only the most recent PRs are walked.
      if (numbersForReviews.length < 25) numbersForReviews.push(pull.number);
    }

    // --- reviews ------------------------------------------------------------
    if (numbersForReviews.length > 0) {
      const reviews = await adapter.getReviews(ref, numbersForReviews);
      for (const review of reviews) {
        const pullRequest = await this.prisma.pullRequest.findUnique({
          where: {
            repositoryId_externalPrId: {
              repositoryId: repository.id,
              externalPrId: review.pullRequestExternalId,
            },
          },
          select: { id: true, firstReviewAt: true },
        });
        if (!pullRequest) continue;

        const identity = await this.identities.resolve({
          organizationId,
          providerId: repository.providerId,
          username: review.reviewerUsername,
        });

        await this.prisma.pullRequestReview.upsert({
          where: {
            pullRequestId_externalReviewId: {
              pullRequestId: pullRequest.id,
              externalReviewId: review.externalId,
            },
          },
          update: { state: review.state, body: review.body, reviewerId: identity.userId },
          create: {
            organizationId,
            pullRequestId: pullRequest.id,
            reviewerId: identity.userId,
            externalReviewId: review.externalId,
            state: review.state,
            body: review.body,
            submittedAt: review.submittedAt,
            metadata: { reviewerUsername: review.reviewerUsername } as Prisma.InputJsonValue,
          },
        });

        // First-review timestamp feeds review responsiveness.
        if (!pullRequest.firstReviewAt) {
          await this.prisma.pullRequest.update({
            where: { id: pullRequest.id },
            data: { firstReviewAt: review.submittedAt },
          });
        }
        result.reviews += 1;
      }

      await this.prisma.$executeRaw`
        UPDATE tbl_pull_request pr
        SET review_count = sub.count
        FROM (
          SELECT pull_request_id, COUNT(*)::int AS count
          FROM tbl_pull_request_review
          GROUP BY pull_request_id
        ) sub
        WHERE pr.id = sub.pull_request_id AND pr.repository_id = ${repository.id}::uuid
      `;
    }

    // --- issues -------------------------------------------------------------
    for (const issue of await adapter.getIssues(ref, window)) {
      const creator = await this.identities.resolve({
        organizationId,
        providerId: repository.providerId,
        username: issue.creatorUsername,
      });
      const assignee = issue.assigneeUsername
        ? await this.identities.resolve({
            organizationId,
            providerId: repository.providerId,
            username: issue.assigneeUsername,
          })
        : { userId: null };

      await this.prisma.issue.upsert({
        where: {
          repositoryId_externalIssueId: {
            repositoryId: repository.id,
            externalIssueId: issue.externalId,
          },
        },
        update: {
          title: issue.title,
          status: issue.status,
          closedAt: issue.closedAt,
          labels: issue.labels,
          assigneeId: assignee.userId,
        },
        create: {
          organizationId,
          repositoryId: repository.id,
          creatorId: creator.userId,
          assigneeId: assignee.userId,
          externalIssueId: issue.externalId,
          number: issue.number,
          title: issue.title,
          description: issue.description,
          status: issue.status,
          labels: issue.labels,
          createdAtExternal: issue.createdAt,
          closedAt: issue.closedAt,
          url: issue.url,
        },
      });
      result.issues += 1;
    }

    // --- CI pipelines -------------------------------------------------------
    for (const pipeline of await adapter.getPipelines(ref, window)) {
      await this.prisma.ciPipeline.upsert({
        where: {
          repositoryId_externalPipelineId: {
            repositoryId: repository.id,
            externalPipelineId: pipeline.externalId,
          },
        },
        update: {
          status: pipeline.status,
          finishedAt: pipeline.finishedAt,
          durationSeconds: pipeline.durationSeconds,
        },
        create: {
          organizationId,
          repositoryId: repository.id,
          externalPipelineId: pipeline.externalId,
          name: pipeline.name,
          branchName: pipeline.branch,
          commitHash: pipeline.commitHash,
          status: pipeline.status,
          startedAt: pipeline.startedAt,
          finishedAt: pipeline.finishedAt,
          durationSeconds: pipeline.durationSeconds,
          url: pipeline.url,
        },
      });
      result.pipelines += 1;
    }

    // --- deployments --------------------------------------------------------
    for (const deployment of await adapter.getDeployments(ref, window)) {
      await this.prisma.deployment.upsert({
        where: {
          repositoryId_externalDeploymentId: {
            repositoryId: repository.id,
            externalDeploymentId: deployment.externalId,
          },
        },
        update: { status: deployment.status },
        create: {
          organizationId,
          repositoryId: repository.id,
          externalDeploymentId: deployment.externalId,
          environment: deployment.environment,
          status: deployment.status,
          commitHash: deployment.commitHash,
          deployedAt: deployment.deployedAt,
          url: deployment.url,
        },
      });
      result.deployments += 1;
    }

    await this.refreshRepositoryMembers(repository.organizationId, repository.id);

    result.total =
      result.commits +
      result.pullRequests +
      result.reviews +
      result.issues +
      result.pipelines +
      result.deployments;

    this.logger.log(
      `Collected ${result.total} records from ${repository.fullName} (${result.commits} commits, ${result.pullRequests} PRs)`,
    );
    return result;
  }

  private async persistCommit(
    repository: Repository,
    commit: ProviderCommit,
    identity: { userId: string | null; isBot: boolean },
  ): Promise<void> {
    const record = await this.prisma.commit.upsert({
      where: {
        repositoryId_externalCommitId: {
          repositoryId: repository.id,
          externalCommitId: commit.externalId,
        },
      },
      update: {
        authorId: identity.isBot ? null : identity.userId,
        isBot: identity.isBot,
        additions: commit.additions,
        deletions: commit.deletions,
        changedFiles: commit.changedFiles,
      },
      create: {
        organizationId: repository.organizationId,
        repositoryId: repository.id,
        authorId: identity.isBot ? null : identity.userId,
        externalCommitId: commit.externalId,
        commitHash: commit.hash,
        message: commit.message.slice(0, 5000),
        branchName: commit.branch ?? repository.defaultBranch,
        committedAt: commit.committedAt,
        additions: commit.additions,
        deletions: commit.deletions,
        changedFiles: commit.changedFiles,
        isMerge: commit.isMerge,
        isBot: identity.isBot,
        url: commit.url,
        metadata: {
          authorUsername: commit.authorUsername ?? commit.authorName,
          authorEmail: commit.authorEmail,
        } as Prisma.InputJsonValue,
      },
    });

    if (!commit.files?.length) return;

    await this.prisma.commitFile.createMany({
      data: commit.files.map((file) => ({
        commitId: record.id,
        filePath: file.path.slice(0, 512),
        changeType: file.changeType.slice(0, 20),
        additions: file.additions,
        deletions: file.deletions,
        language: languageOf(file.path),
        isTestFile: TEST_PATH.test(file.path),
        isDocFile: DOC_PATH.test(file.path),
      })),
      skipDuplicates: true,
    });
  }

  /** Rebuilds contributor counts so the repository member list stays accurate. */
  private async refreshRepositoryMembers(organizationId: string, repositoryId: string) {
    const grouped = await this.prisma.commit.groupBy({
      by: ['authorId'],
      where: { organizationId, repositoryId, authorId: { not: null }, isBot: false },
      _count: { _all: true },
    });

    for (const row of grouped) {
      if (!row.authorId) continue;
      await this.prisma.repositoryMember.upsert({
        where: { repositoryId_userId: { repositoryId, userId: row.authorId } },
        update: { contributions: row._count._all },
        create: {
          organizationId,
          repositoryId,
          userId: row.authorId,
          contributions: row._count._all,
        },
      });
    }
  }

  /**
   * A first import backfills the configured history window (oldest first, so
   * trends have a baseline); an incremental run starts from the last sync.
   */
  private window(repository: Repository, jobType: SyncJobType): CollectionWindow {
    if (jobType === 'FULL_IMPORT' || !repository.lastSyncAt) {
      const months = this.config.get<number>('sync.historyMonths', 12);
      const since = new Date();
      since.setUTCMonth(since.getUTCMonth() - months);
      return { since, maxPages: 10 };
    }
    // Overlap by an hour so an event in flight during the last run is not missed.
    return {
      since: new Date(repository.lastSyncAt.getTime() - 60 * 60 * 1000),
      maxPages: 3,
    };
  }
}

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  py: 'Python',
  java: 'Java',
  go: 'Go',
  rb: 'Ruby',
  php: 'PHP',
  cs: 'C#',
  cpp: 'C++',
  c: 'C',
  rs: 'Rust',
  kt: 'Kotlin',
  swift: 'Swift',
  scala: 'Scala',
  sql: 'SQL',
  sh: 'Shell',
  yml: 'YAML',
  yaml: 'YAML',
  json: 'JSON',
  md: 'Markdown',
  css: 'CSS',
  scss: 'SCSS',
  html: 'HTML',
};

function languageOf(path: string): string | undefined {
  const extension = path.split('.').pop()?.toLowerCase();
  return extension ? LANGUAGE_BY_EXTENSION[extension] : undefined;
}

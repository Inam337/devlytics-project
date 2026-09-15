import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma, SyncJobStatus, SyncJobType } from '@prisma/client';
import { Queue } from 'bullmq';
import { AuditService } from '../audit/audit.service';
import { PaginatedResult, PaginationQueryDto } from '../common/dto/pagination.dto';
import { AppException } from '../common/exceptions/app.exception';
import { QueryUtil } from '../common/utils/query.util';
import { PrismaService } from '../database/prisma.service';
import { QUEUE } from '../queue/queue.constants';
import { safeEnqueue } from '../queue/queue.util';

export interface SyncJobSummary {
  id: string;
  repositoryId: string | null;
  jobType: SyncJobType;
  status: SyncJobStatus;
  queued: boolean;
}

/**
 * Owns `tbl_sync_job` and the git-sync queue.
 *
 * The job row is written first and the queue message second, so an unavailable
 * Redis leaves a durable record of the intent rather than losing the request.
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @InjectQueue(QUEUE.GIT_SYNC) private readonly gitSyncQueue: Queue,
  ) {}

  /** Stage 2: twelve-month backfill for each newly imported repository. */
  async queueFullImport(
    organizationId: string,
    repositoryIds: string[],
    requestedBy?: string,
  ): Promise<SyncJobSummary[]> {
    return this.queue(organizationId, repositoryIds, 'FULL_IMPORT', requestedBy);
  }

  /** Stage 6: incremental collection triggered by a webhook or the poll. */
  async queueIncremental(
    organizationId: string,
    repositoryIds: string[],
    requestedBy?: string,
  ): Promise<SyncJobSummary[]> {
    return this.queue(organizationId, repositoryIds, 'INCREMENTAL', requestedBy);
  }

  /** Manual "sync now" from the repository detail screen. */
  async syncRepository(organizationId: string, repositoryId: string, requestedBy: string) {
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, organizationId },
      include: { provider: { select: { id: true, status: true, displayName: true } } },
    });
    if (!repository) throw AppException.notFound('Repository', repositoryId);

    if (repository.provider.status === 'DISCONNECTED') {
      throw AppException.unprocessable(
        `${repository.provider.displayName} is disconnected. Reconnect it before syncing.`,
      );
    }

    const inFlight = await this.prisma.syncJob.findFirst({
      where: { organizationId, repositoryId, status: { in: ['QUEUED', 'RUNNING'] } },
    });
    if (inFlight) {
      throw AppException.conflict('A sync is already in progress for this repository');
    }

    const [job] = await this.queue(
      organizationId,
      [repositoryId],
      repository.syncStatus === 'NEVER_SYNCED' ? 'FULL_IMPORT' : 'INCREMENTAL',
      requestedBy,
    );

    await this.audit.record({
      organizationId,
      actorId: requestedBy,
      category: 'REPOSITORY',
      action: 'repository.sync_requested',
      summary: `Manual sync requested for '${repository.fullName}'`,
      entityType: 'Repository',
      entityId: repositoryId,
    });

    return job;
  }

  private async queue(
    organizationId: string,
    repositoryIds: string[],
    jobType: SyncJobType,
    requestedBy?: string,
  ): Promise<SyncJobSummary[]> {
    if (repositoryIds.length === 0) return [];

    const repositories = await this.prisma.repository.findMany({
      where: { organizationId, id: { in: repositoryIds } },
      select: { id: true, providerId: true, fullName: true },
    });

    const summaries: SyncJobSummary[] = [];

    for (const repository of repositories) {
      const job = await this.prisma.syncJob.create({
        data: {
          organizationId,
          providerId: repository.providerId,
          repositoryId: repository.id,
          requestedById: requestedBy,
          jobType,
          status: SyncJobStatus.QUEUED,
          queueName: QUEUE.GIT_SYNC,
          payload: { fullName: repository.fullName } as Prisma.InputJsonValue,
        },
      });

      await this.prisma.repository.update({
        where: { id: repository.id },
        data: { syncStatus: 'QUEUED' },
      });

      const queued = await safeEnqueue(
        this.gitSyncQueue,
        jobType,
        {
          organizationId,
          repositoryId: repository.id,
          syncJobId: job.id,
          requestedBy,
        },
        this.logger,
        { jobId: job.id },
      );

      if (!queued) {
        await this.prisma.syncJob.update({
          where: { id: job.id },
          data: {
            status: SyncJobStatus.FAILED,
            errorMessage: 'Queue unavailable — the job was recorded but not dispatched',
            finishedAt: new Date(),
          },
        });
        // The repository keeps its previous values rather than being zeroed.
        await this.prisma.repository.update({
          where: { id: repository.id },
          data: { syncStatus: 'FAILED', syncError: 'Background queue unavailable' },
        });
      }

      summaries.push({
        id: job.id,
        repositoryId: repository.id,
        jobType,
        status: queued ? SyncJobStatus.QUEUED : SyncJobStatus.FAILED,
        queued,
      });
    }

    return summaries;
  }

  async findJobs(
    organizationId: string,
    query: PaginationQueryDto,
    status?: SyncJobStatus,
    repositoryId?: string,
  ) {
    const where: Prisma.SyncJobWhereInput = {
      organizationId,
      ...QueryUtil.compact({ status, repositoryId }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.syncJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
        include: {
          repository: { select: { id: true, name: true, fullName: true } },
          provider: { select: { id: true, providerType: true, displayName: true } },
        },
      }),
      this.prisma.syncJob.count({ where }),
    ]);

    return PaginatedResult.from(items, total, query);
  }

  /** Per-repository progress for the live import screen. */
  async importProgress(organizationId: string) {
    const [repositories, active] = await this.prisma.$transaction([
      this.prisma.repository.findMany({
        where: { organizationId },
        select: { id: true, fullName: true, syncStatus: true, lastSyncAt: true, syncError: true },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.syncJob.findMany({
        where: { organizationId, status: { in: ['QUEUED', 'RUNNING', 'RETRYING'] } },
        select: {
          id: true,
          repositoryId: true,
          status: true,
          progressPercent: true,
          itemsProcessed: true,
          itemsTotal: true,
        },
      }),
    ]);

    const byRepository = new Map(active.map((job) => [job.repositoryId, job]));
    const completed = repositories.filter((repo) => repo.syncStatus === 'SYNCED').length;

    return {
      total: repositories.length,
      completed,
      inProgress: active.length,
      // Partial results are never published as a ranking.
      scoresWithheld: completed < repositories.length && repositories.length > 0,
      repositories: repositories.map((repository) => ({
        ...repository,
        job: byRepository.get(repository.id) ?? null,
      })),
    };
  }

  async markRunning(syncJobId: string): Promise<void> {
    await this.prisma.syncJob.update({
      where: { id: syncJobId },
      data: { status: SyncJobStatus.RUNNING, startedAt: new Date(), attempts: { increment: 1 } },
    });
  }

  async markProgress(syncJobId: string, processed: number, total: number): Promise<void> {
    await this.prisma.syncJob.update({
      where: { id: syncJobId },
      data: {
        itemsProcessed: processed,
        itemsTotal: total,
        progressPercent: total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0,
      },
    });
  }

  async markCompleted(syncJobId: string, processed: number): Promise<void> {
    await this.prisma.syncJob.update({
      where: { id: syncJobId },
      data: {
        status: SyncJobStatus.COMPLETED,
        finishedAt: new Date(),
        progressPercent: 100,
        itemsProcessed: processed,
        errorMessage: null,
      },
    });
  }

  async markFailed(syncJobId: string, message: string): Promise<void> {
    await this.prisma.syncJob.update({
      where: { id: syncJobId },
      data: {
        status: SyncJobStatus.FAILED,
        finishedAt: new Date(),
        errorMessage: message.slice(0, 1000),
      },
    });
  }

  /** Consecutive failures for a repository, used for the sync-failure alert. */
  async consecutiveFailures(organizationId: string, repositoryId: string): Promise<number> {
    const recent = await this.prisma.syncJob.findMany({
      where: { organizationId, repositoryId, status: { in: ['COMPLETED', 'FAILED'] } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { status: true },
    });

    let streak = 0;
    for (const job of recent) {
      if (job.status !== 'FAILED') break;
      streak += 1;
    }
    return streak;
  }
}

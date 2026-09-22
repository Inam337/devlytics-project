import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { SyncService } from '../sync/sync.service';

/**
 * `@Interval` needs a literal at class-definition time (it runs before Nest's
 * DI container exists), so the poll period is read from the same env var
 * `configuration.ts#sync.reconcileIntervalMinutes` reads — not from
 * `ConfigService`, which is only available once injected below.
 */
const RECONCILE_INTERVAL_MINUTES = Number(
  process.env.SYNC_RECONCILE_INTERVAL_MINUTES ?? 5,
);

/**
 * Scheduled automation (devlytics.md §4.1/§4.2, §3.1, §6): none of this
 * existed before WOR-9 — this module is the first user of `@nestjs/schedule`
 * and the shared infrastructure WOR-10/WOR-11/WOR-12 register their own jobs
 * on.
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: SyncService,
    private readonly config: ConfigService,
  ) {}

  /**
   * WOR-9: five-minute (configurable) incremental poll that reconciles any
   * activity a missed webhook delivery would otherwise have lost —
   * devlytics.md §4.2 "A missed event delays a number, never loses it."
   *
   * Reuses `SyncService#queueIncremental` — the same single write path
   * webhooks.service.ts's post-verification handler already uses (see
   * WOR-3's architecture note) — rather than writing a second collector.
   */
  @Interval(RECONCILE_INTERVAL_MINUTES * 60_000)
  async reconcileWebhooks(): Promise<void> {
    const minutes = this.config.get<number>('sync.reconcileIntervalMinutes', 5);
    const cutoff = new Date(Date.now() - minutes * 60_000);

    const repositories = await this.prisma.repository.findMany({
      where: {
        isArchived: false,
        // NEVER_SYNCED is the initial-import flow, not a missed webhook;
        // QUEUED/SYNCING already has a sync in flight — enqueuing again would
        // just create a duplicate job for the same repository.
        syncStatus: {
          notIn: ['DISCONNECTED', 'NEVER_SYNCED', 'QUEUED', 'SYNCING'],
        },
        lastSyncAt: { lt: cutoff },
      },
      select: { id: true, organizationId: true },
    });

    if (repositories.length === 0) {
      this.logger.log('Webhook reconciliation: no repositories due for a poll');
      return;
    }

    const byOrganization = new Map<string, string[]>();
    for (const repository of repositories) {
      const ids = byOrganization.get(repository.organizationId) ?? [];
      ids.push(repository.id);
      byOrganization.set(repository.organizationId, ids);
    }

    let reconciled = 0;
    for (const [organizationId, repositoryIds] of byOrganization) {
      try {
        const jobs = await this.sync.queueIncremental(
          organizationId,
          repositoryIds,
        );
        reconciled += jobs.filter((job) => job.queued).length;
      } catch (error) {
        this.logger.error(
          `Webhook reconciliation failed for organization ${organizationId}: ${
            (error as Error).message
          }`,
        );
      }
    }

    this.logger.log(
      `Webhook reconciliation: queued incremental sync for ${reconciled}/${repositories.length} ` +
        `repository(ies) across ${byOrganization.size} organization(s)`,
    );
  }
}

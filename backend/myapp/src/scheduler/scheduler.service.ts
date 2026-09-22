import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { GoalsService } from '../goals/goals.service';
import { PrismaService } from '../database/prisma.service';
import { SyncService } from '../sync/sync.service';
import { UsersService } from '../users/users.service';

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
    private readonly users: UsersService,
    private readonly goals: GoalsService,
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

  /**
   * WOR-10: daily 90-day (configurable) inactivity auto-suspension —
   * devlytics.md §3.1 "no commits, reviews or logins for 90 consecutive
   * days → automatic suspension, audit-logged, excluded from current
   * rankings but historical scores preserved."
   *
   * `UsersService#suspendInactive` already implements the candidate query,
   * the audit log entry, and setting both `User.status` and
   * `OrganizationUser.status` to `SUSPENDED` — it just had no caller before
   * this job. Ranking exclusion needs no extra code here: `ScoringService
   * #recomputeOrganization` only iterates `OrganizationUser` rows with
   * `status: 'ACTIVE'`, so a suspended user simply stops getting new
   * `DeveloperScore`/`RankingHistory` rows; their historical ones are never
   * touched by this job.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async suspendInactiveUsers(): Promise<void> {
    const inactivityDays = this.config.get<number>(
      'sync.inactivitySuspendDays',
      90,
    );
    const organizations = await this.prisma.organization.findMany({
      select: { id: true },
    });

    let totalSuspended = 0;
    for (const organization of organizations) {
      try {
        const suspended = await this.users.suspendInactive(
          organization.id,
          inactivityDays,
        );
        totalSuspended += suspended.length;
      } catch (error) {
        this.logger.error(
          `Inactivity suspension sweep failed for organization ${organization.id}: ${
            (error as Error).message
          }`,
        );
      }
    }

    this.logger.log(
      `Inactivity suspension sweep: ${totalSuspended} user(s) suspended across ` +
        `${organizations.length} organization(s) (threshold ${inactivityDays} days)`,
    );
  }

  /**
   * WOR-11: daily 14-day (configurable) goal at-risk sweep —
   * devlytics.md §6 Goals "At-risk rule: no measurable movement in 14 days."
   *
   * `GoalsService#evaluateForRepository` already re-checks this window as a
   * byproduct of a fresh quality snapshot, but that only fires for goals on
   * repositories that actually synced recently. This job catches the rest:
   * goals whose repository hasn't synced in a while still age into `AT_RISK`
   * on schedule instead of silently staying `ACTIVE` forever.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async sweepAtRiskGoals(): Promise<void> {
    const atRiskDays = this.config.get<number>('sync.goalAtRiskDays', 14);
    const organizations = await this.prisma.organization.findMany({
      select: { id: true },
    });

    let totalFlagged = 0;
    for (const organization of organizations) {
      try {
        const flagged = await this.goals.sweepAtRisk(
          organization.id,
          atRiskDays,
        );
        totalFlagged += flagged.length;
      } catch (error) {
        this.logger.error(
          `Goal at-risk sweep failed for organization ${organization.id}: ${
            (error as Error).message
          }`,
        );
      }
    }

    this.logger.log(
      `Goal at-risk sweep: flagged ${totalFlagged} goal(s) as AT_RISK across ` +
        `${organizations.length} organization(s) (threshold ${atRiskDays} days)`,
    );
  }
}

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { RankingPeriod } from '@prisma/client';
import { Queue } from 'bullmq';
import { PeriodRange, PeriodUtil } from '../common/utils/period.util';
import { PrismaService } from '../database/prisma.service';
import { GoalsService } from '../goals/goals.service';
import { NotificationEvent } from '../notifications/notification-events';
import {
  NotificationsService,
  NotifyInput,
} from '../notifications/notifications.service';
import { QUEUE } from '../queue/queue.constants';
import { safeEnqueue } from '../queue/queue.util';
import { ExportActor, ReportsService } from '../reports/reports.service';
import { SyncService } from '../sync/sync.service';
import { UsersService } from '../users/users.service';

const ALL_RANKING_PERIODS: RankingPeriod[] = [
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'YEARLY',
];

/** Digest emails/AI reports only make sense on these cadences — a DAILY close
 * fires every single day and QUARTERLY/YEARLY are too rare to call "digests". */
const DIGEST_PERIODS: RankingPeriod[] = ['WEEKLY', 'MONTHLY'];

/** Hard cap on how many missed periods one organization's startup catch-up
 * will backfill, so a very-long-stopped instance can't loop unboundedly. */
const MAX_CATCHUP_PERIODS = 60;

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
export class SchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: SyncService,
    private readonly users: UsersService,
    private readonly goals: GoalsService,
    private readonly reports: ReportsService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
    @InjectQueue(QUEUE.RANKING_CALCULATION)
    private readonly rankingQueue: Queue,
  ) {}

  /**
   * WOR-12 acceptance criterion: "missing a scheduled run does not silently
   * skip a period." Runs once per process start — for every organization and
   * period type, walks forward from the last `RankingHistory` entry to today,
   * re-enqueuing `RANKING_CALCULATION` for any fully-elapsed period that was
   * never closed (e.g. the process was down across a period boundary).
   *
   * Deliberately does **not** re-send digests/AI reports for backfilled
   * periods — days- or weeks-late "your weekly summary" emails for several
   * missed periods at once would be spammy, not useful. Only the ranking
   * history itself (the durable, no-email-attached record) gets caught up.
   */
  async onApplicationBootstrap(): Promise<void> {
    const organizations = await this.prisma.organization.findMany({
      select: { id: true },
    });
    const today = PeriodUtil.startOfUtcDay(new Date());

    for (const organization of organizations) {
      for (const period of ALL_RANKING_PERIODS) {
        try {
          await this.backfillMissedPeriods(organization.id, period, today);
        } catch (error) {
          this.logger.error(
            `Period-close catch-up failed for organization ${organization.id} (${period}): ${
              (error as Error).message
            }`,
          );
        }
      }
    }
  }

  private async backfillMissedPeriods(
    organizationId: string,
    period: RankingPeriod,
    today: Date,
  ): Promise<void> {
    const lastClosed = await this.prisma.rankingHistory.findFirst({
      where: { organizationId, period },
      orderBy: { periodStart: 'desc' },
      select: { periodEnd: true },
    });
    // No baseline yet — nothing to catch up from; the first close happens at
    // the next natural boundary via the scheduled job below.
    if (!lastClosed) return;

    let cursor = PeriodUtil.addDays(lastClosed.periodEnd, 1);
    let backfilled = 0;

    for (let i = 0; i < MAX_CATCHUP_PERIODS && cursor <= today; i += 1) {
      const range = PeriodUtil.resolve(period, cursor);
      // The period containing "today" is either still open or is the
      // scheduled job's job to close — never backfilled.
      if (range.end >= today) break;

      await this.closePeriod(organizationId, period, range.end, range, false);
      backfilled += 1;
      cursor = PeriodUtil.addDays(range.end, 1);
    }

    if (backfilled > 0) {
      this.logger.log(
        `Period-close catch-up: backfilled ${backfilled} missed ${period} period(s) for organization ${organizationId}`,
      );
    }
    if (backfilled >= MAX_CATCHUP_PERIODS) {
      this.logger.warn(
        `Period-close catch-up hit the ${MAX_CATCHUP_PERIODS}-period cap for organization ${organizationId} (${period}) — more periods may still be missing`,
      );
    }
  }

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

  /**
   * WOR-12: daily period-close trigger — devlytics.md §5.3 "Leaderboard
   * positions close per period and are retained for ranking history."
   *
   * Runs before the other daily jobs (so a closing ranking period is queued
   * ahead of the day's inactivity/at-risk sweeps). For every organization and
   * every `RankingPeriod`, checks whether *today* is that period's last day
   * (`PeriodUtil.resolve(period, today).end === today` — true for DAILY every
   * day, WEEKLY on Sundays, MONTHLY/QUARTERLY on the last day of the
   * month/quarter, YEARLY on Dec 31) and closes it if so.
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async triggerPeriodClose(): Promise<void> {
    const organizations = await this.prisma.organization.findMany({
      select: { id: true },
    });
    const today = PeriodUtil.startOfUtcDay(new Date());

    let closed = 0;
    for (const organization of organizations) {
      for (const period of ALL_RANKING_PERIODS) {
        const range = PeriodUtil.resolve(period, today);
        if (range.end.getTime() !== today.getTime()) continue;

        try {
          await this.closePeriod(organization.id, period, today, range, true);
          closed += 1;
        } catch (error) {
          this.logger.error(
            `Period close failed for organization ${organization.id} (${period}): ${
              (error as Error).message
            }`,
          );
        }
      }
    }

    this.logger.log(
      `Period-close trigger: closed ${closed} period(s) across ${organizations.length} organization(s)`,
    );
  }

  /**
   * Shared by the daily trigger and the startup catch-up. `reference` is the
   * period's closing date — always passed explicitly to `RANKING_CALCULATION`
   * so a backfilled historical period resolves the *historical* window, not
   * "now". `includeReportsAndDigests` is false for backfilled periods (see
   * `onApplicationBootstrap`'s docstring for why).
   */
  private async closePeriod(
    organizationId: string,
    period: RankingPeriod,
    reference: Date,
    range: PeriodRange,
    includeReportsAndDigests: boolean,
  ): Promise<void> {
    // Reuses GitSyncProcessor's jobId convention for DAILY so the same day's
    // per-repo-sync recompute and this period-close recompute dedupe against
    // each other instead of doing the work twice. Dash-separated, not
    // colon-separated — BullMQ rejects a custom jobId containing ':'.
    await safeEnqueue(
      this.rankingQueue,
      'recompute',
      { organizationId, period, reference: reference.toISOString() },
      this.logger,
      {
        jobId: `ranking-calc-${organizationId}-${period}-${PeriodUtil.toDateOnly(range.end)}`,
      },
    );

    if (!includeReportsAndDigests || !DIGEST_PERIODS.includes(period)) return;

    const admin = await this.prisma.organizationUser.findFirst({
      where: {
        organizationId,
        status: 'ACTIVE',
        role: { key: 'ORGANIZATION_ADMIN' },
      },
      select: { userId: true },
    });
    if (!admin) {
      this.logger.warn(
        `Skipping period-close reports/digests for organization ${organizationId}: no active organization admin found`,
      );
      return;
    }
    const adminActor: ExportActor = {
      userId: admin.userId,
      roleKey: 'ORGANIZATION_ADMIN',
    };

    await this.triggerTeamReportsAndDigests(organizationId, period, adminActor);
    await this.triggerIndividualReportsAndDigests(organizationId, period);
    await this.triggerProjectCompletionSummary(
      organizationId,
      range,
      admin.userId,
    );
  }

  /** Team AI-analysis report export + team leaderboard digest, per active team. */
  private async triggerTeamReportsAndDigests(
    organizationId: string,
    period: RankingPeriod,
    adminActor: ExportActor,
  ): Promise<void> {
    const teams = await this.prisma.team.findMany({
      where: { organizationId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        members: { select: { userId: true } },
      },
    });

    const digestInputs: NotifyInput[] = [];
    for (const team of teams) {
      await this.reports.requestExport(
        organizationId,
        { reportType: 'TEAM_AI_ANALYSIS', format: 'PDF', teamId: team.id },
        adminActor,
      );
      for (const member of team.members) {
        digestInputs.push({
          organizationId,
          userId: member.userId,
          event: NotificationEvent.TEAM_LEADERBOARD_DIGEST,
          title: `${team.name} — leaderboard digest`,
          body: `Your team's ${period.toLowerCase()} leaderboard digest is ready.`,
          channel: 'EMAIL',
        });
      }
    }
    await this.notifications.notifyMany(digestInputs);
  }

  /** Individual AI-analysis report export + weekly/monthly summary, per active developer. */
  private async triggerIndividualReportsAndDigests(
    organizationId: string,
    period: RankingPeriod,
  ): Promise<void> {
    const developers = await this.prisma.organizationUser.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        role: { key: 'DEVELOPER' },
      },
      select: { userId: true },
    });

    for (const developer of developers) {
      // Self-requested: satisfies ReportsService's individual-report access
      // check trivially, and is real attribution — this is *their* report.
      await this.reports.requestExport(
        organizationId,
        {
          reportType: 'INDIVIDUAL_AI_ANALYSIS',
          format: 'PDF',
          targetUserId: developer.userId,
        },
        { userId: developer.userId, roleKey: 'DEVELOPER' },
      );
    }

    await this.notifications.notifyMany(
      developers.map((developer) => ({
        organizationId,
        userId: developer.userId,
        event: NotificationEvent.WEEKLY_DEVELOPER_SUMMARY,
        title: 'Your performance summary is ready',
        body: `Your ${period.toLowerCase()} performance summary has been generated.`,
        channel: 'EMAIL' as const,
      })),
    );
  }

  /** One digest to the org admin(s) summarizing projects that completed this period. */
  private async triggerProjectCompletionSummary(
    organizationId: string,
    range: PeriodRange,
    adminUserId: string,
  ): Promise<void> {
    const completed = await this.prisma.project.findMany({
      where: {
        organizationId,
        status: 'COMPLETED',
        updatedAt: {
          gte: range.start,
          lt: PeriodUtil.addDays(range.end, 1),
        },
      },
      select: { name: true },
    });
    if (completed.length === 0) return;

    await this.notifications.notify({
      organizationId,
      userId: adminUserId,
      event: NotificationEvent.PROJECT_COMPLETION_SUMMARY,
      title: 'Project completion summary',
      body: `${completed.length} project(s) completed this period: ${completed
        .map((project) => project.name)
        .join(', ')}`,
      channel: 'EMAIL',
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CodeQualitySnapshot, GoalStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { AppException } from '../common/exceptions/app.exception';
import { goalCompletedMail } from '../common/mail-templates/digest-milestone-alert.templates';
import { MailService } from '../common/services/mail.service';
import { NumberUtil } from '../common/utils/number.util';
import { QueryUtil } from '../common/utils/query.util';
import { PrismaService } from '../database/prisma.service';
import { NotificationEvent } from '../notifications/notification-events';
import { NotificationsService } from '../notifications/notifications.service';
import type { ActorContext } from '../organizations/organizations.service';
import {
  CreateGoalDto,
  GOAL_METRIC_KEYS,
  GoalMetricKey,
  GoalsQueryDto,
  UpdateGoalDto,
} from './dto/goals.dto';

const SORTABLE = ['createdAt', 'dueDate', 'status'] as const;

const SNAPSHOT_FIELD: Record<GoalMetricKey, keyof CodeQualitySnapshot> = {
  quality_score: 'qualityScore',
  coverage_percent: 'coveragePercent',
  duplication_percent: 'duplicationPercent',
  complexity: 'complexity',
  maintainability_score: 'maintainabilityScore',
  bugs: 'bugs',
  code_smells: 'codeSmells',
  vulnerabilities: 'vulnerabilities',
  technical_debt_minutes: 'technicalDebtMinutes',
};

/**
 * Improvement goals (docs/devlytics.md §6 Goals; product principle §1.3).
 *
 * A goal never completes by manual action — only by comparing the stored
 * baseline to a later analysis run. `evaluateForRepository` is the one place
 * that re-measures a goal and is called whenever a new quality snapshot lands.
 */
@Injectable()
export class GoalsService {
  private readonly logger = new Logger(GoalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  private appUrl(): string {
    return this.config.get<string>('app.url', 'http://localhost:3000');
  }

  async create(
    organizationId: string,
    dto: CreateGoalDto,
    actor: ActorContext,
  ) {
    if (!GOAL_METRIC_KEYS.includes(dto.metricKey)) {
      throw AppException.badRequest(
        `Unsupported metricKey. Use one of: ${GOAL_METRIC_KEYS.join(', ')}`,
      );
    }
    if (dto.ownerType === 'DEVELOPER' && !dto.ownerUserId) {
      throw AppException.badRequest(
        'ownerUserId is required when ownerType is DEVELOPER',
      );
    }
    if (dto.ownerType === 'TEAM' && !dto.ownerTeamId) {
      throw AppException.badRequest(
        'ownerTeamId is required when ownerType is TEAM',
      );
    }

    const repository = await this.prisma.repository.findFirst({
      where: { id: dto.repositoryId, organizationId },
    });
    if (!repository)
      throw AppException.notFound('Repository', dto.repositoryId);

    const latestSnapshot = await this.prisma.codeQualitySnapshot.findFirst({
      where: { organizationId, repositoryId: dto.repositoryId },
      orderBy: { snapshotDate: 'desc' },
    });

    const baseline = latestSnapshot
      ? NumberUtil.toNumber(
          latestSnapshot[SNAPSHOT_FIELD[dto.metricKey]] as
            | Prisma.Decimal
            | number,
        )
      : 0;

    const goal = await this.prisma.improvementGoal.create({
      data: {
        organizationId,
        ownerType: dto.ownerType,
        ownerUserId:
          dto.ownerType === 'DEVELOPER' ? dto.ownerUserId : undefined,
        ownerTeamId: dto.ownerType === 'TEAM' ? dto.ownerTeamId : undefined,
        repositoryId: dto.repositoryId,
        qualityIssueId: dto.qualityIssueId,
        recommendationId: dto.recommendationId,
        createdById: actor.actorId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        metricKey: dto.metricKey,
        direction: dto.direction,
        baselineValue: new Prisma.Decimal(baseline),
        targetValue: new Prisma.Decimal(dto.targetValue),
        currentValue: new Prisma.Decimal(baseline),
        baselineRunId: latestSnapshot?.analysisRunId ?? undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        lastMovementAt: new Date(),
      },
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'GOAL',
      action: 'goal.created',
      summary: `Goal '${goal.title}' created with baseline ${baseline}`,
      entityType: 'ImprovementGoal',
      entityId: goal.id,
      after: { metricKey: dto.metricKey, baseline, target: dto.targetValue },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toView(goal);
  }

  async findAll(organizationId: string, query: GoalsQueryDto) {
    const where: Prisma.ImprovementGoalWhereInput = {
      organizationId,
      ...QueryUtil.compact({
        status: query.status,
        ownerType: query.ownerType,
        ownerUserId: query.ownerUserId,
        ownerTeamId: query.ownerTeamId,
      }),
      ...QueryUtil.search(query.search, ['title', 'description']),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.improvementGoal.findMany({
        where,
        orderBy: QueryUtil.orderBy(
          query.sortBy,
          query.sortOrder,
          SORTABLE,
          'createdAt',
        ),
        skip: query.skip,
        take: query.limit,
        include: {
          repository: { select: { id: true, name: true, fullName: true } },
        },
      }),
      this.prisma.improvementGoal.count({ where }),
    ]);

    return PaginatedResult.from(items.map(toView), total, query);
  }

  async findOne(organizationId: string, id: string) {
    const goal = await this.prisma.improvementGoal.findFirst({
      where: { id, organizationId },
      include: {
        repository: { select: { id: true, name: true, fullName: true } },
        progress: { orderBy: { progressDate: 'asc' } },
      },
    });
    if (!goal) throw AppException.notFound('Goal', id);
    return toView(goal);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateGoalDto,
    actor: ActorContext,
  ) {
    const existing = await this.prisma.improvementGoal.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw AppException.notFound('Goal', id);

    if (dto.status && dto.status !== 'ABANDONED') {
      throw AppException.badRequest(
        'Goal status can only be changed to ABANDONED manually — completion is computed by re-analysis only',
      );
    }

    const updated = await this.prisma.improvementGoal.update({
      where: { id },
      data: QueryUtil.compact({
        title: dto.title,
        description: dto.description,
        status: dto.status,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      }),
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'GOAL',
      action: 'goal.updated',
      summary: `Goal '${existing.title}' updated`,
      entityType: 'ImprovementGoal',
      entityId: id,
      before: { status: existing.status },
      after: { status: updated.status },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toView(updated);
  }

  async remove(organizationId: string, id: string, actor: ActorContext) {
    const existing = await this.prisma.improvementGoal.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw AppException.notFound('Goal', id);

    await this.prisma.improvementGoal.delete({ where: { id } });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'GOAL',
      action: 'goal.deleted',
      summary: `Goal '${existing.title}' deleted`,
      entityType: 'ImprovementGoal',
      entityId: id,
    });

    return { id, deleted: true };
  }

  async findProgress(organizationId: string, goalId: string) {
    await this.findOne(organizationId, goalId);
    return this.prisma.improvementGoalProgress.findMany({
      where: { goalId },
      orderBy: { progressDate: 'asc' },
    });
  }

  /** Manual "check now" — still only re-measures, it never sets a value by hand. */
  async recheckProgress(
    organizationId: string,
    goalId: string,
    recordedById?: string,
  ) {
    const goal = await this.prisma.improvementGoal.findFirst({
      where: { id: goalId, organizationId },
    });
    if (!goal) throw AppException.notFound('Goal', goalId);
    if (!goal.repositoryId) {
      throw AppException.unprocessable(
        'This goal has no repository to re-measure against',
      );
    }

    const snapshot = await this.prisma.codeQualitySnapshot.findFirst({
      where: { organizationId, repositoryId: goal.repositoryId },
      orderBy: { snapshotDate: 'desc' },
    });
    if (!snapshot) {
      throw AppException.unprocessable(
        'No analysis run exists yet for this repository',
      );
    }

    return this.applyMeasurement(goal, snapshot, recordedById);
  }

  /** Called after a repository's quality snapshot updates, for every affected goal. */
  async evaluateForRepository(
    organizationId: string,
    repositoryId: string,
  ): Promise<number> {
    const snapshot = await this.prisma.codeQualitySnapshot.findFirst({
      where: { organizationId, repositoryId },
      orderBy: { snapshotDate: 'desc' },
    });
    if (!snapshot) return 0;

    const goals = await this.prisma.improvementGoal.findMany({
      where: {
        organizationId,
        repositoryId,
        status: { in: ['ACTIVE', 'AT_RISK'] },
      },
    });

    for (const goal of goals) {
      await this.applyMeasurement(goal, snapshot);
    }
    return goals.length;
  }

  /**
   * WOR-11: standalone daily sweep, called from `SchedulerService`.
   *
   * `evaluateForRepository`'s at-risk check only runs as a byproduct of a
   * fresh quality snapshot (triggered by a repo sync), so a goal on a
   * repository that hasn't synced recently would otherwise never get
   * flagged. Only touches `ACTIVE` goals — `COMPLETED`/`ABANDONED` are
   * excluded by the status filter, and the reverse transition (`AT_RISK` →
   * `ACTIVE`/`COMPLETED` on new movement) stays `evaluateForRepository`'s job
   * so it isn't duplicated here.
   */
  async sweepAtRisk(
    organizationId: string,
    atRiskDays: number,
  ): Promise<string[]> {
    const cutoff = new Date(Date.now() - atRiskDays * 24 * 60 * 60 * 1000);

    const goals = await this.prisma.improvementGoal.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        // No movement ever recorded falls back to the goal's own creation
        // date, so a goal that's simply never been measured still ages out.
        OR: [
          { lastMovementAt: { lt: cutoff } },
          { lastMovementAt: null, createdAt: { lt: cutoff } },
        ],
      },
      select: { id: true },
    });

    for (const goal of goals) {
      await this.prisma.improvementGoal.update({
        where: { id: goal.id },
        data: { status: 'AT_RISK' },
      });
    }

    return goals.map((goal) => goal.id);
  }

  private async applyMeasurement(
    goal: {
      id: string;
      metricKey: string;
      targetValue: Prisma.Decimal;
      direction: string;
      currentValue: Prisma.Decimal;
      ownerType: string;
      ownerUserId: string | null;
      ownerTeamId: string | null;
      title: string;
      organizationId: string;
      lastMovementAt: Date | null;
    },
    snapshot: CodeQualitySnapshot,
    recordedById?: string,
  ) {
    const metricKey = goal.metricKey as GoalMetricKey;
    if (!(metricKey in SNAPSHOT_FIELD)) return;

    const measured = NumberUtil.toNumber(
      snapshot[SNAPSHOT_FIELD[metricKey]] as Prisma.Decimal | number,
    );
    const target = NumberUtil.toNumber(goal.targetValue);
    const previousValue = NumberUtil.toNumber(goal.currentValue);
    const moved = Math.abs(measured - previousValue) > 0.001;

    const percentComplete =
      goal.direction === 'INCREASE'
        ? NumberUtil.clampScore(NumberUtil.percent(measured, target || 1))
        : target === 0
          ? measured <= 0
            ? 100
            : 0
          : NumberUtil.clampScore(100 - NumberUtil.percent(measured, target));

    const achieved =
      goal.direction === 'INCREASE' ? measured >= target : measured <= target;

    const atRiskDays = this.config.get<number>('sync.goalAtRiskDays', 14);
    const now = new Date();
    const lastMovementAt = moved ? now : (goal.lastMovementAt ?? now);
    const atRisk =
      !achieved &&
      now.getTime() - lastMovementAt.getTime() >
        atRiskDays * 24 * 60 * 60 * 1000;

    const nextStatus: GoalStatus = achieved
      ? 'COMPLETED'
      : atRisk
        ? 'AT_RISK'
        : 'ACTIVE';

    await this.prisma.$transaction([
      this.prisma.improvementGoalProgress.create({
        data: {
          goalId: goal.id,
          analysisRunId: snapshot.analysisRunId,
          recordedById,
          progressDate: new Date(),
          measuredValue: new Prisma.Decimal(measured),
          deltaFromBaseline: new Prisma.Decimal(measured - previousValue),
          percentComplete: new Prisma.Decimal(percentComplete),
        },
      }),
      this.prisma.improvementGoal.update({
        where: { id: goal.id },
        data: {
          currentValue: new Prisma.Decimal(measured),
          status: nextStatus,
          lastMovementAt,
          verifiedRunId: achieved ? snapshot.analysisRunId : undefined,
          completedAt: achieved ? now : undefined,
        },
      }),
    ]);

    if (achieved) {
      const notifyUserId =
        goal.ownerType === 'DEVELOPER' ? goal.ownerUserId : null;
      if (notifyUserId) {
        await this.notifications.notify({
          organizationId: goal.organizationId,
          userId: notifyUserId,
          event: NotificationEvent.GOAL_COMPLETED,
          title: `Goal completed: ${goal.title}`,
          body: `Re-analysis confirmed the target was reached (${measured}).`,
          actionUrl: `/goals/${goal.id}`,
        });
        await this.sendGoalCompletedMail(notifyUserId, goal, measured, target);
      }
      this.logger.log(
        `Goal ${goal.id} completed at ${measured} (target ${target})`,
      );
    }

    return nextStatus;
  }

  private async sendGoalCompletedMail(
    userId: string,
    goal: { id: string; title: string },
    measuredValue: number,
    targetValue: number,
  ): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true },
      });
      if (!user) return;
      const result = await this.mail.sendTemplate(
        user.email,
        goalCompletedMail({
          recipientFirstName: user.firstName,
          goalTitle: goal.title,
          measuredValue,
          targetValue,
          ctaUrl: `${this.appUrl()}/goals/${goal.id}`,
        }),
      );
      if (!result.success) {
        this.logger.warn(
          `Goal-completed email failed for user ${userId}: ${result.error}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Unexpected error sending goal-completed email to user ${userId}: ${(error as Error).message}`,
      );
    }
  }
}

function toView(goal: {
  baselineValue: Prisma.Decimal;
  targetValue: Prisma.Decimal;
  currentValue: Prisma.Decimal;
  [key: string]: unknown;
}) {
  return {
    ...goal,
    baselineValue: NumberUtil.toNumber(goal.baselineValue),
    targetValue: NumberUtil.toNumber(goal.targetValue),
    currentValue: NumberUtil.toNumber(goal.currentValue),
  };
}

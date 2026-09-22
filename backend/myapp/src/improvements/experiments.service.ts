import { Injectable } from '@nestjs/common';
import { ExperimentStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { AppException } from '../common/exceptions/app.exception';
import { NumberUtil } from '../common/utils/number.util';
import { QueryUtil } from '../common/utils/query.util';
import { PrismaService } from '../database/prisma.service';
import type { ActorContext } from '../organizations/organizations.service';
import {
  CreateExperimentDto,
  CreateExperimentMetricDto,
  ExperimentMetricKey,
  ExperimentsQueryDto,
  UpdateExperimentDto,
  UpdateExperimentMetricDto,
} from './dto/experiments.dto';
import { MetricCalculationService } from './metric-calculation.service';
import { ProgressCalculationService } from './progress-calculation.service';

const SORTABLE = ['createdAt', 'startDate', 'status', 'title'] as const;
/** Baseline is measured over the 30 days immediately before the experiment starts. */
const BASELINE_WINDOW_DAYS = 30;

/** The only status transitions a caller may reach; anything else is rejected (pasted spec §19). */
const ALLOWED_TRANSITIONS: Record<ExperimentStatus, ExperimentStatus[]> = {
  DRAFT: ['PLANNED', 'ACTIVE', 'CANCELLED'],
  PLANNED: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['PAUSED', 'COMPLETED', 'CANCELLED'],
  PAUSED: ['ACTIVE', 'CANCELLED'],
  COMPLETED: ['PROVEN', 'FAILED'],
  PROVEN: [],
  FAILED: [],
  CANCELLED: [],
};

function assertTransition(
  current: ExperimentStatus,
  target: ExperimentStatus,
): void {
  if (!ALLOWED_TRANSITIONS[current]?.includes(target)) {
    throw AppException.badRequest(
      `Cannot transition experiment from ${current} to ${target}`,
      'INVALID_EXPERIMENT_STATE',
    );
  }
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function metricToView<
  T extends {
    baselineValue: unknown;
    targetValue: unknown;
    currentValue: unknown;
    finalValue: unknown;
  },
>(metric: T) {
  return {
    ...metric,
    baselineValue:
      metric.baselineValue === null
        ? null
        : NumberUtil.toNumber(metric.baselineValue as Prisma.Decimal),
    targetValue:
      metric.targetValue === null
        ? null
        : NumberUtil.toNumber(metric.targetValue as Prisma.Decimal),
    currentValue:
      metric.currentValue === null
        ? null
        : NumberUtil.toNumber(metric.currentValue as Prisma.Decimal),
    finalValue:
      metric.finalValue === null
        ? null
        : NumberUtil.toNumber(metric.finalValue as Prisma.Decimal),
  };
}

/**
 * Engineering experiments: the middle of the Improvement Engine flow
 * (docs/Interactive design .../DEVLYTICS-SPEC.md improvement engine addendum) —
 * MEASURE → DETECT → EXPLAIN → RECOMMEND → GOAL → EXPERIMENT → RE-MEASURE → PROVE.
 * Baselines and results are always calculated from stored activity
 * (`MetricCalculationService`), never accepted as an unchecked number from a caller
 * unless the caller supplied one explicitly at metric-creation time.
 */
@Injectable()
export class ExperimentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly metricCalculation: MetricCalculationService,
    private readonly progressCalculation: ProgressCalculationService,
  ) {}

  async create(
    organizationId: string,
    dto: CreateExperimentDto,
    actor: ActorContext,
  ) {
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;
    if (endDate && endDate <= startDate) {
      throw AppException.badRequest(
        'endDate must be after startDate',
        'INVALID_DATE_RANGE',
      );
    }

    await this.verifyTenantReferences(organizationId, dto);

    const hasExplicitScope = Boolean(
      dto.userId || dto.teamId || dto.projectId || dto.repositoryId,
    );
    const userId = dto.userId ?? (hasExplicitScope ? undefined : actor.actorId);

    const experiment = await this.prisma.engineeringExperiment.create({
      data: {
        organizationId,
        userId,
        teamId: dto.teamId,
        projectId: dto.projectId,
        repositoryId: dto.repositoryId,
        recommendationId: dto.recommendationId,
        goalId: dto.goalId,
        createdById: actor.actorId,
        title: dto.title,
        description: dto.description,
        problemStatement: dto.problemStatement,
        hypothesis: dto.hypothesis,
        intervention: dto.intervention,
        startDate,
        endDate,
      },
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'EXPERIMENT',
      action: 'experiment.created',
      summary: `Experiment '${experiment.title}' created`,
      entityType: 'EngineeringExperiment',
      entityId: experiment.id,
      after: { status: experiment.status, title: experiment.title },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return experiment;
  }

  async findAll(organizationId: string, query: ExperimentsQueryDto) {
    const where: Prisma.EngineeringExperimentWhereInput = {
      organizationId,
      ...QueryUtil.compact({
        status: query.status,
        userId: query.userId,
        teamId: query.teamId,
        projectId: query.projectId,
        repositoryId: query.repositoryId,
      }),
      ...QueryUtil.search(query.search, ['title', 'description']),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.engineeringExperiment.findMany({
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
          _count: { select: { metrics: true } },
          repository: { select: { id: true, name: true, fullName: true } },
          team: { select: { id: true, name: true, code: true } },
        },
      }),
      this.prisma.engineeringExperiment.count({ where }),
    ]);

    return PaginatedResult.from(items, total, query);
  }

  async findOne(organizationId: string, id: string) {
    const experiment = await this.findExperimentOrThrow(organizationId, id, {
      metrics: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
      proof: true,
      repository: { select: { id: true, name: true, fullName: true } },
      team: { select: { id: true, name: true, code: true } },
      project: { select: { id: true, name: true, code: true } },
      recommendation: { select: { id: true, title: true } },
      goal: { select: { id: true, title: true } },
    });

    return {
      ...experiment,
      metrics: experiment.metrics.map(metricToView),
    };
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateExperimentDto,
    actor: ActorContext,
  ) {
    const existing = await this.findExperimentOrThrow(organizationId, id);

    if (dto.status && dto.status !== existing.status) {
      assertTransition(existing.status, dto.status);
      if (dto.status !== 'PLANNED' && dto.status !== 'CANCELLED') {
        throw AppException.badRequest(
          `Use the lifecycle endpoints (start/pause/complete/cancel) to move to ${dto.status}`,
          'INVALID_EXPERIMENT_STATE',
        );
      }
    }

    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;
    if (endDate && endDate <= existing.startDate) {
      throw AppException.badRequest(
        'endDate must be after startDate',
        'INVALID_DATE_RANGE',
      );
    }

    const updated = await this.prisma.engineeringExperiment.update({
      where: { id },
      data: QueryUtil.compact({
        title: dto.title,
        description: dto.description,
        problemStatement: dto.problemStatement,
        hypothesis: dto.hypothesis,
        intervention: dto.intervention,
        endDate,
        status: dto.status,
      }),
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'EXPERIMENT',
      action: 'experiment.updated',
      summary: `Experiment '${existing.title}' updated`,
      entityType: 'EngineeringExperiment',
      entityId: id,
      before: { status: existing.status },
      after: { status: updated.status },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  async remove(organizationId: string, id: string, actor: ActorContext) {
    const existing = await this.findExperimentOrThrow(organizationId, id);
    if (existing.status !== 'DRAFT' && existing.status !== 'CANCELLED') {
      throw AppException.conflict(
        'Only draft or cancelled experiments can be deleted — cancel an in-flight experiment first',
        'INVALID_EXPERIMENT_STATE',
      );
    }

    await this.prisma.engineeringExperiment.delete({ where: { id } });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'EXPERIMENT',
      action: 'experiment.deleted',
      summary: `Experiment '${existing.title}' deleted`,
      entityType: 'EngineeringExperiment',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { id, deleted: true };
  }

  async start(organizationId: string, id: string, actor: ActorContext) {
    const experiment = await this.findExperimentOrThrow(organizationId, id, {
      metrics: true,
    });
    assertTransition(experiment.status, 'ACTIVE');

    if (experiment.status !== 'PAUSED') {
      await this.captureBaselines(organizationId, experiment);
    }

    const updated = await this.prisma.engineeringExperiment.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'EXPERIMENT',
      action: 'experiment.started',
      summary: `Experiment '${experiment.title}' started`,
      entityType: 'EngineeringExperiment',
      entityId: id,
      before: { status: experiment.status },
      after: { status: 'ACTIVE' },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  async pause(organizationId: string, id: string, actor: ActorContext) {
    const experiment = await this.findExperimentOrThrow(organizationId, id);
    assertTransition(experiment.status, 'PAUSED');

    const updated = await this.prisma.engineeringExperiment.update({
      where: { id },
      data: { status: 'PAUSED' },
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'EXPERIMENT',
      action: 'experiment.paused',
      summary: `Experiment '${experiment.title}' paused`,
      entityType: 'EngineeringExperiment',
      entityId: id,
      before: { status: experiment.status },
      after: { status: 'PAUSED' },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  async complete(organizationId: string, id: string, actor: ActorContext) {
    const experiment = await this.findExperimentOrThrow(organizationId, id, {
      metrics: true,
    });
    assertTransition(experiment.status, 'COMPLETED');

    const resultSummary = await this.captureFinalMeasurements(
      organizationId,
      experiment,
    );

    const updated = await this.prisma.engineeringExperiment.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date(), resultSummary },
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'EXPERIMENT',
      action: 'experiment.completed',
      summary: `Experiment '${experiment.title}' completed`,
      entityType: 'EngineeringExperiment',
      entityId: id,
      before: { status: experiment.status },
      after: { status: 'COMPLETED' },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  async cancel(organizationId: string, id: string, actor: ActorContext) {
    const experiment = await this.findExperimentOrThrow(organizationId, id);
    assertTransition(experiment.status, 'CANCELLED');

    const updated = await this.prisma.engineeringExperiment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'EXPERIMENT',
      action: 'experiment.cancelled',
      summary: `Experiment '${experiment.title}' cancelled`,
      entityType: 'EngineeringExperiment',
      entityId: id,
      before: { status: experiment.status },
      after: { status: 'CANCELLED' },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  // ---------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------

  async listMetrics(organizationId: string, experimentId: string) {
    await this.findExperimentOrThrow(organizationId, experimentId);
    const metrics = await this.prisma.experimentMetric.findMany({
      where: { experimentId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    return metrics.map(metricToView);
  }

  async addMetric(
    organizationId: string,
    experimentId: string,
    dto: CreateExperimentMetricDto,
    actor: ActorContext,
  ) {
    const experiment = await this.findExperimentOrThrow(
      organizationId,
      experimentId,
    );

    const duplicate = await this.prisma.experimentMetric.findUnique({
      where: {
        experimentId_metricKey: { experimentId, metricKey: dto.metricKey },
      },
    });
    if (duplicate)
      throw AppException.duplicate('Experiment metric', 'metricKey');

    if (dto.isPrimary) {
      await this.prisma.experimentMetric.updateMany({
        where: { experimentId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    let baselineValue = dto.baselineValue;
    let baselinePeriodStart: Date | undefined;
    let baselinePeriodEnd: Date | undefined;
    if (baselineValue === undefined && experiment.status !== 'DRAFT') {
      const window = this.baselineWindow(experiment.startDate);
      const result = await this.metricCalculation.calculate(
        organizationId,
        dto.metricKey,
        this.scopeOf(experiment),
        window.start,
        window.end,
      );
      if (!result.insufficientData) {
        baselineValue = result.value ?? undefined;
        baselinePeriodStart = window.start;
        baselinePeriodEnd = window.end;
      }
    }

    const metric = await this.prisma.experimentMetric.create({
      data: {
        experimentId,
        metricName: dto.metricName,
        metricKey: dto.metricKey,
        metricType: dto.metricType,
        unit: dto.unit,
        direction: dto.direction,
        baselineValue,
        targetValue: dto.targetValue,
        currentValue: baselineValue,
        isPrimary: dto.isPrimary ?? false,
        baselinePeriodStart,
        baselinePeriodEnd,
      },
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'EXPERIMENT',
      action: 'experiment.metric_added',
      summary: `Metric '${metric.metricName}' added to experiment '${experiment.title}'`,
      entityType: 'ExperimentMetric',
      entityId: metric.id,
      after: {
        metricKey: metric.metricKey,
        baselineValue,
        targetValue: dto.targetValue,
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return metricToView(metric);
  }

  async updateMetric(
    organizationId: string,
    experimentId: string,
    metricId: string,
    dto: UpdateExperimentMetricDto,
    actor: ActorContext,
  ) {
    await this.findExperimentOrThrow(organizationId, experimentId);
    const metric = await this.prisma.experimentMetric.findFirst({
      where: { id: metricId, experimentId },
    });
    if (!metric) throw AppException.notFound('Experiment metric', metricId);

    if (dto.isPrimary) {
      await this.prisma.experimentMetric.updateMany({
        where: { experimentId, isPrimary: true, NOT: { id: metricId } },
        data: { isPrimary: false },
      });
    }

    const updated = await this.prisma.experimentMetric.update({
      where: { id: metricId },
      data: QueryUtil.compact({
        metricName: dto.metricName,
        unit: dto.unit,
        targetValue: dto.targetValue,
        isPrimary: dto.isPrimary,
      }),
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'EXPERIMENT',
      action: 'experiment.metric_updated',
      summary: `Metric '${metric.metricName}' updated`,
      entityType: 'ExperimentMetric',
      entityId: metricId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return metricToView(updated);
  }

  async removeMetric(
    organizationId: string,
    experimentId: string,
    metricId: string,
    actor: ActorContext,
  ) {
    await this.findExperimentOrThrow(organizationId, experimentId);
    const metric = await this.prisma.experimentMetric.findFirst({
      where: { id: metricId, experimentId },
    });
    if (!metric) throw AppException.notFound('Experiment metric', metricId);

    await this.prisma.experimentMetric.delete({ where: { id: metricId } });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'EXPERIMENT',
      action: 'experiment.metric_removed',
      summary: `Metric '${metric.metricName}' removed`,
      entityType: 'ExperimentMetric',
      entityId: metricId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { id: metricId, deleted: true };
  }

  // ---------------------------------------------------------------------
  // Progress
  // ---------------------------------------------------------------------

  async progress(organizationId: string, experimentId: string) {
    const experiment = await this.findExperimentOrThrow(
      organizationId,
      experimentId,
      { metrics: true },
    );

    const metrics = experiment.metrics.map((metric) => {
      const baseline =
        metric.baselineValue === null
          ? null
          : NumberUtil.toNumber(metric.baselineValue);
      const target =
        metric.targetValue === null
          ? null
          : NumberUtil.toNumber(metric.targetValue);
      const current =
        metric.currentValue === null
          ? null
          : NumberUtil.toNumber(metric.currentValue);

      const status =
        baseline === null || target === null
          ? 'NOT_STARTED'
          : this.progressCalculation.status({
              direction: metric.direction,
              baseline,
              target,
              current,
              startDate: experiment.startDate,
              endDate: experiment.endDate,
            });

      const percentComplete =
        baseline !== null && target !== null && current !== null
          ? this.progressCalculation.percentComplete(
              metric.direction,
              baseline,
              target,
              current,
            )
          : null;

      return {
        metricId: metric.id,
        metricKey: metric.metricKey,
        metricName: metric.metricName,
        isPrimary: metric.isPrimary,
        baseline,
        target,
        current,
        percentComplete,
        status,
      };
    });

    const primary = metrics.find((m) => m.isPrimary) ?? metrics[0];

    return {
      experimentId,
      experimentStatus: experiment.status,
      overallStatus: primary?.status ?? 'NOT_STARTED',
      metrics,
    };
  }

  /** Recomputes `currentValue` for every metric of every ACTIVE experiment — called by the background job. */
  async refreshActiveExperimentMetrics(
    organizationId: string,
  ): Promise<number> {
    const experiments = await this.prisma.engineeringExperiment.findMany({
      where: { organizationId, status: 'ACTIVE' },
      include: { metrics: true },
    });

    for (const experiment of experiments) {
      for (const metric of experiment.metrics) {
        const result = await this.metricCalculation.calculate(
          organizationId,
          metric.metricKey as ExperimentMetricKey,
          this.scopeOf(experiment),
          experiment.startDate,
          new Date(),
        );
        if (!result.insufficientData && result.value !== null) {
          await this.prisma.experimentMetric.update({
            where: { id: metric.id },
            data: {
              currentValue: result.value,
              measurementPeriodStart: experiment.startDate,
              measurementPeriodEnd: new Date(),
            },
          });
        }
      }
    }
    return experiments.length;
  }

  // ---------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------

  private async findExperimentOrThrow<
    T extends Prisma.EngineeringExperimentInclude = Record<string, never>,
  >(organizationId: string, id: string, include?: T) {
    const experiment = await this.prisma.engineeringExperiment.findFirst({
      where: { id, organizationId },
      include,
    });
    if (!experiment) throw AppException.notFound('Experiment', id);
    return experiment as Prisma.EngineeringExperimentGetPayload<{ include: T }>;
  }

  private scopeOf(experiment: {
    userId: string | null;
    teamId: string | null;
    projectId: string | null;
    repositoryId: string | null;
  }) {
    return {
      userId: experiment.userId,
      teamId: experiment.teamId,
      projectId: experiment.projectId,
      repositoryId: experiment.repositoryId,
    };
  }

  private baselineWindow(startDate: Date): { start: Date; end: Date } {
    return { start: addDays(startDate, -BASELINE_WINDOW_DAYS), end: startDate };
  }

  private async captureBaselines(
    organizationId: string,
    experiment: {
      id: string;
      startDate: Date;
      userId: string | null;
      teamId: string | null;
      projectId: string | null;
      repositoryId: string | null;
      metrics: { id: string; metricKey: string; baselineValue: unknown }[];
    },
  ) {
    const window = this.baselineWindow(experiment.startDate);
    const summary: Record<string, unknown> = {};
    const scope = this.scopeOf(experiment);

    for (const metric of experiment.metrics) {
      if (metric.baselineValue !== null) continue; // an explicit baseline was already supplied

      const result = await this.metricCalculation.calculate(
        organizationId,
        metric.metricKey as ExperimentMetricKey,
        scope,
        window.start,
        window.end,
      );
      summary[metric.metricKey] = result;

      if (!result.insufficientData && result.value !== null) {
        await this.prisma.experimentMetric.update({
          where: { id: metric.id },
          data: {
            baselineValue: result.value,
            currentValue: result.value,
            baselinePeriodStart: window.start,
            baselinePeriodEnd: window.end,
          },
        });
      }
    }

    await this.prisma.engineeringExperiment.update({
      where: { id: experiment.id },
      data: { baselineSummary: summary as Prisma.InputJsonValue },
    });
  }

  private async captureFinalMeasurements(
    organizationId: string,
    experiment: {
      id: string;
      startDate: Date;
      endDate: Date | null;
      userId: string | null;
      teamId: string | null;
      projectId: string | null;
      repositoryId: string | null;
      metrics: { id: string; metricKey: string }[];
    },
  ): Promise<Prisma.InputJsonValue> {
    const end =
      experiment.endDate && experiment.endDate < new Date()
        ? experiment.endDate
        : new Date();
    const summary: Record<string, unknown> = {};
    const scope = this.scopeOf(experiment);

    for (const metric of experiment.metrics) {
      const result = await this.metricCalculation.calculate(
        organizationId,
        metric.metricKey as ExperimentMetricKey,
        scope,
        experiment.startDate,
        end,
      );
      summary[metric.metricKey] = result;

      if (!result.insufficientData && result.value !== null) {
        await this.prisma.experimentMetric.update({
          where: { id: metric.id },
          data: {
            finalValue: result.value,
            currentValue: result.value,
            measurementPeriodStart: experiment.startDate,
            measurementPeriodEnd: end,
          },
        });
      }
    }

    return summary as Prisma.InputJsonValue;
  }

  private async verifyTenantReferences(
    organizationId: string,
    dto: CreateExperimentDto,
  ): Promise<void> {
    const checks: Promise<void>[] = [];

    if (dto.teamId) {
      checks.push(
        this.prisma.team
          .findFirst({ where: { id: dto.teamId, organizationId } })
          .then((row) => {
            if (!row) throw AppException.notFound('Team', dto.teamId);
          }),
      );
    }
    if (dto.projectId) {
      checks.push(
        this.prisma.project
          .findFirst({ where: { id: dto.projectId, organizationId } })
          .then((row) => {
            if (!row) throw AppException.notFound('Project', dto.projectId);
          }),
      );
    }
    if (dto.repositoryId) {
      checks.push(
        this.prisma.repository
          .findFirst({ where: { id: dto.repositoryId, organizationId } })
          .then((row) => {
            if (!row)
              throw AppException.notFound('Repository', dto.repositoryId);
          }),
      );
    }
    if (dto.recommendationId) {
      checks.push(
        this.prisma.improvementRecommendation
          .findFirst({ where: { id: dto.recommendationId, organizationId } })
          .then((row) => {
            if (!row)
              throw AppException.notFound(
                'Recommendation',
                dto.recommendationId,
              );
          }),
      );
    }
    if (dto.goalId) {
      checks.push(
        this.prisma.improvementGoal
          .findFirst({ where: { id: dto.goalId, organizationId } })
          .then((row) => {
            if (!row) throw AppException.notFound('Goal', dto.goalId);
          }),
      );
    }
    if (dto.userId) {
      checks.push(
        this.prisma.organizationUser
          .findUnique({
            where: {
              organizationId_userId: { organizationId, userId: dto.userId },
            },
          })
          .then((row) => {
            if (!row) throw AppException.notFound('User', dto.userId);
          }),
      );
    }

    await Promise.all(checks);
  }
}

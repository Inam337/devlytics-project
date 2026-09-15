import { Injectable } from '@nestjs/common';
import { ExperimentConfidence, MetricDirection, Prisma, VerificationStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/exceptions/app.exception';
import { NumberUtil } from '../common/utils/number.util';
import { PrismaService } from '../database/prisma.service';
import { NotificationEvent } from '../notifications/notification-events';
import { NotificationsService } from '../notifications/notifications.service';
import type { ActorContext } from '../organizations/organizations.service';
import { ProgressCalculationService } from './progress-calculation.service';

/** Below this many days a result is never called HIGH confidence, however clean the number looks. */
const HIGH_CONFIDENCE_MIN_DURATION_DAYS = 14;
const MEDIUM_CONFIDENCE_MIN_DURATION_DAYS = 7;

interface SignalChange {
  metricKey: string;
  baseline: number | null;
  final: number | null;
  changePercentage: number | null;
  favorable: boolean | null;
}

/**
 * The one place an experiment is verified (pasted spec §21-23). AI never marks an
 * improvement proven — this service compares stored baseline and final measurements
 * only, and confidence is derived from data volume and consistency, never asserted
 * from an AI confidence score alone.
 */
@Injectable()
export class ImprovementVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly progressCalculation: ProgressCalculationService,
  ) {}

  async verify(organizationId: string, experimentId: string, actor: ActorContext) {
    const experiment = await this.prisma.engineeringExperiment.findFirst({
      where: { id: experimentId, organizationId },
      include: { metrics: true },
    });
    if (!experiment) throw AppException.notFound('Experiment', experimentId);
    if (experiment.status !== 'COMPLETED') {
      throw AppException.unprocessable(
        'Experiment must be completed before it can be verified',
        'INVALID_EXPERIMENT_STATE',
      );
    }

    const primary = experiment.metrics.find((m) => m.isPrimary);
    if (!primary) {
      throw AppException.unprocessable('Experiment has no primary metric to verify against', 'INVALID_METRIC');
    }

    const baseline = primary.baselineValue === null ? null : NumberUtil.toNumber(primary.baselineValue);
    const final = primary.finalValue === null ? null : NumberUtil.toNumber(primary.finalValue);
    const target = primary.targetValue === null ? null : NumberUtil.toNumber(primary.targetValue);

    const supporting: SignalChange[] = experiment.metrics
      .filter((m) => m.id !== primary.id)
      .map((m) => this.signalChange(m.metricKey, m.direction, m.baselineValue, m.finalValue));

    const primaryChange = this.signalChange(primary.metricKey, primary.direction, primary.baselineValue, primary.finalValue);

    let verificationStatus: VerificationStatus;
    let targetAchieved = false;
    let improvementPercentage: number | null = primaryChange.changePercentage;

    if (baseline === null || final === null || target === null) {
      verificationStatus = 'INSUFFICIENT_DATA';
    } else {
      targetAchieved = this.progressCalculation.achieved(primary.direction, target, final);
      if (targetAchieved) {
        verificationStatus = 'ACHIEVED';
      } else if ((improvementPercentage ?? 0) > 0) {
        verificationStatus = 'PARTIALLY_ACHIEVED';
      } else {
        verificationStatus = 'NOT_ACHIEVED';
      }
    }

    const durationDays =
      experiment.completedAt && experiment.startDate
        ? Math.max(0, (experiment.completedAt.getTime() - experiment.startDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
    const corroboratingCount = supporting.filter((s) => s.favorable === true).length;
    const confidence = this.confidenceFor(verificationStatus, durationDays, corroboratingCount);

    const periodStart = primary.measurementPeriodStart ?? experiment.startDate;
    const periodEnd = primary.measurementPeriodEnd ?? experiment.completedAt;
    const evidence = {
      primaryMetric: primaryChange,
      supportingSignals: supporting,
      dataPeriod: {
        start: periodStart ? periodStart.toISOString() : null,
        end: periodEnd ? periodEnd.toISOString() : null,
      },
    };

    const evidenceSummary = this.summarize(verificationStatus, primaryChange, targetAchieved);

    const proof = await this.prisma.improvementProof.upsert({
      where: { experimentId },
      create: {
        organizationId,
        experimentId,
        primaryMetricId: primary.id,
        verificationStatus,
        baselineValue: baseline,
        finalValue: final,
        targetValue: target,
        improvementPercentage,
        targetAchieved,
        confidence,
        evidenceSummary,
        evidence: evidence as unknown as Prisma.InputJsonValue,
        resultSummary: evidenceSummary,
        verifiedAt: new Date(),
      },
      update: {
        verificationStatus,
        baselineValue: baseline,
        finalValue: final,
        targetValue: target,
        improvementPercentage,
        targetAchieved,
        confidence,
        evidenceSummary,
        evidence: evidence as unknown as Prisma.InputJsonValue,
        resultSummary: evidenceSummary,
        verifiedAt: new Date(),
      },
    });

    const nextStatus = targetAchieved ? 'PROVEN' : 'FAILED';
    await this.prisma.engineeringExperiment.update({
      where: { id: experimentId },
      data: { status: nextStatus, confidence },
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'EXPERIMENT',
      action: 'experiment.verified',
      summary: `Experiment '${experiment.title}' verified: ${verificationStatus} (${confidence} confidence)`,
      entityType: 'EngineeringExperiment',
      entityId: experimentId,
      after: { verificationStatus, targetAchieved, improvementPercentage, confidence },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    if (targetAchieved && experiment.userId) {
      await this.notifications.notify({
        organizationId,
        userId: experiment.userId,
        event: NotificationEvent.EXPERIMENT_TARGET_REACHED,
        title: `Improvement proven: ${experiment.title}`,
        body: evidenceSummary,
        actionUrl: `/improvements/experiments/${experimentId}`,
      });
    }

    return this.toProofView(proof);
  }

  async findProof(organizationId: string, experimentId: string) {
    const proof = await this.prisma.improvementProof.findFirst({ where: { experimentId, organizationId } });
    if (!proof) throw AppException.notFound('Improvement proof', experimentId);
    return this.toProofView(proof);
  }

  private signalChange(
    metricKey: string,
    direction: MetricDirection,
    baselineValue: unknown,
    finalValue: unknown,
  ): SignalChange {
    const baseline = baselineValue === null || baselineValue === undefined ? null : NumberUtil.toNumber(baselineValue as Prisma.Decimal);
    const final = finalValue === null || finalValue === undefined ? null : NumberUtil.toNumber(finalValue as Prisma.Decimal);

    if (baseline === null || final === null) {
      return { metricKey, baseline, final, changePercentage: null, favorable: null };
    }

    const rawChangePercent = baseline !== 0 ? NumberUtil.round(((final - baseline) / Math.abs(baseline)) * 100, 2) : 0;
    // Report the change in the metric's own terms (rawChangePercent), but judge
    // "favorable" against its direction: a DECREASE metric improves when it goes down.
    // TARGET_RANGE has no single favorable direction, so it's left unknown.
    const favorable: boolean | null =
      direction === 'DECREASE' ? final < baseline : direction === 'INCREASE' ? final > baseline : null;
    const changePercentage = direction === 'DECREASE' ? -rawChangePercent : rawChangePercent;

    return { metricKey, baseline, final, changePercentage, favorable };
  }

  private confidenceFor(status: VerificationStatus, durationDays: number, corroboratingCount: number): ExperimentConfidence {
    if (status === 'INSUFFICIENT_DATA') return 'INSUFFICIENT_DATA';
    if (status === 'NOT_ACHIEVED') return durationDays >= MEDIUM_CONFIDENCE_MIN_DURATION_DAYS ? 'MEDIUM' : 'LOW';
    if (status === 'PARTIALLY_ACHIEVED') return 'LOW';

    // ACHIEVED
    if (durationDays >= HIGH_CONFIDENCE_MIN_DURATION_DAYS && corroboratingCount >= 1) return 'HIGH';
    if (durationDays >= MEDIUM_CONFIDENCE_MIN_DURATION_DAYS) return 'MEDIUM';
    return 'LOW';
  }

  private summarize(status: VerificationStatus, primary: SignalChange, targetAchieved: boolean): string {
    if (status === 'INSUFFICIENT_DATA') {
      return `Not enough measured data to verify '${primary.metricKey}' — no baseline or final value was calculable.`;
    }
    const change = primary.changePercentage !== null ? `${primary.changePercentage > 0 ? '+' : ''}${primary.changePercentage}%` : 'no change';
    if (targetAchieved) {
      return `Target reached: '${primary.metricKey}' moved ${change} from baseline (${primary.baseline} → ${primary.final}).`;
    }
    return `Target not reached: '${primary.metricKey}' moved ${change} from baseline (${primary.baseline} → ${primary.final}).`;
  }

  private toProofView<
    T extends {
      baselineValue: unknown;
      finalValue: unknown;
      targetValue: unknown;
      improvementPercentage: unknown;
    },
  >(proof: T) {
    return {
      ...proof,
      baselineValue: proof.baselineValue === null ? null : NumberUtil.toNumber(proof.baselineValue as Prisma.Decimal),
      finalValue: proof.finalValue === null ? null : NumberUtil.toNumber(proof.finalValue as Prisma.Decimal),
      targetValue: proof.targetValue === null ? null : NumberUtil.toNumber(proof.targetValue as Prisma.Decimal),
      improvementPercentage:
        proof.improvementPercentage === null ? null : NumberUtil.toNumber(proof.improvementPercentage as Prisma.Decimal),
    };
  }
}

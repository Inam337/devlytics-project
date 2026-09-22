import { Injectable } from '@nestjs/common';
import { MetricDirection } from '@prisma/client';
import { NumberUtil } from '../common/utils/number.util';

export type ProgressStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'ON_TRACK'
  | 'AT_RISK'
  | 'TARGET_REACHED'
  | 'OFF_TRACK';

/** TARGET_RANGE has no stored min/max (the schema carries a single targetValue) — "in range" means within this tolerance of it. */
const TARGET_RANGE_TOLERANCE_PERCENT = 5;
/** Past this share of the planned window with < 50% progress, a metric is flagged AT_RISK. */
const AT_RISK_ELAPSED_RATIO = 0.66;
const AT_RISK_PERCENT_THRESHOLD = 50;

/**
 * Progress is always measured against baseline→target, never `(current/target)*100`
 * (pasted spec §18 — that formula misreads a DECREASE metric). Centralized here so
 * every caller — the read API, the background job, and verification — agrees.
 */
@Injectable()
export class ProgressCalculationService {
  /** Percent of the baseline→target distance covered; can go negative (moved the wrong way) or past 100 (overshot). */
  percentComplete(
    direction: MetricDirection,
    baseline: number,
    target: number,
    current: number,
  ): number {
    if (direction === 'TARGET_RANGE') {
      if (target === 0) return current === 0 ? 100 : 0;
      const deviation = (Math.abs(current - target) / Math.abs(target)) * 100;
      return NumberUtil.round(100 - deviation);
    }

    const needed =
      direction === 'DECREASE' ? baseline - target : target - baseline;
    if (needed === 0)
      return this.achieved(direction, target, current) ? 100 : 0;

    const moved =
      direction === 'DECREASE' ? baseline - current : current - baseline;
    return NumberUtil.round((moved / needed) * 100);
  }

  achieved(
    direction: MetricDirection,
    target: number,
    current: number,
  ): boolean {
    if (direction === 'DECREASE') return current <= target;
    if (direction === 'INCREASE') return current >= target;
    if (target === 0) return current === 0;
    return (
      (Math.abs(current - target) / Math.abs(target)) * 100 <=
      TARGET_RANGE_TOLERANCE_PERCENT
    );
  }

  status(params: {
    direction: MetricDirection;
    baseline: number | null;
    target: number | null;
    current: number | null;
    startDate: Date;
    endDate?: Date | null;
    now?: Date;
  }): ProgressStatus {
    const { direction, baseline, target, current, startDate, endDate } = params;
    const now = params.now ?? new Date();

    if (current === null || baseline === null || target === null)
      return 'NOT_STARTED';
    if (this.achieved(direction, target, current)) return 'TARGET_REACHED';

    const percent = this.percentComplete(direction, baseline, target, current);
    if (percent < 0) return 'OFF_TRACK';
    if (percent === 0) return 'IN_PROGRESS';

    if (endDate && endDate > startDate) {
      const elapsedRatio = NumberUtil.round(
        Math.min(
          1,
          Math.max(
            0,
            (now.getTime() - startDate.getTime()) /
              (endDate.getTime() - startDate.getTime()),
          ),
        ),
        4,
      );
      if (
        elapsedRatio >= AT_RISK_ELAPSED_RATIO &&
        percent < AT_RISK_PERCENT_THRESHOLD
      )
        return 'AT_RISK';
    }

    return percent >= AT_RISK_PERCENT_THRESHOLD ? 'ON_TRACK' : 'IN_PROGRESS';
  }
}

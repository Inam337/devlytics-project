import { Prisma } from '@prisma/client';

type Numeric = number | string | Prisma.Decimal | null | undefined;

/**
 * Prisma returns DECIMAL columns as `Decimal` objects. Every read path funnels
 * through these helpers so numbers reach the API as plain JSON numbers.
 */
export const NumberUtil = {
  toNumber(value: Numeric, fallback = 0): number {
    if (value === null || value === undefined) return fallback;
    const parsed = typeof value === 'number' ? value : Number(value.toString());
    return Number.isFinite(parsed) ? parsed : fallback;
  },

  round(value: number, decimals = 2): number {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  },

  /** Clamps into the 0..100 score domain used everywhere in the platform. */
  clampScore(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return NumberUtil.round(Math.min(100, Math.max(0, value)));
  },

  percent(part: number, total: number): number {
    if (!total) return 0;
    return NumberUtil.round((part / total) * 100);
  },

  /** Linear 0..100 normalisation with saturation at `best`. */
  normalize(value: number, best: number): number {
    if (best <= 0) return 0;
    return NumberUtil.clampScore((value / best) * 100);
  },

  /** Inverted normalisation: lower raw values score higher (bugs, duplication). */
  normalizeInverse(value: number, worst: number): number {
    if (worst <= 0) return 100;
    return NumberUtil.clampScore(100 - (value / worst) * 100);
  },

  sum(values: number[]): number {
    return values.reduce((total, value) => total + value, 0);
  },

  average(values: number[]): number {
    return values.length
      ? NumberUtil.round(NumberUtil.sum(values) / values.length)
      : 0;
  },
};

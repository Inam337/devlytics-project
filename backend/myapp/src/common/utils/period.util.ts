import { RankingPeriod } from '@prisma/client';

export interface PeriodRange {
  period: RankingPeriod;
  start: Date;
  end: Date;
}

const startOfUtcDay = (date: Date): Date =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

/**
 * Period arithmetic for scoring, rankings and reports. Everything is UTC and
 * inclusive of both endpoints, matching the daily-metric grain in the database.
 */
export const PeriodUtil = {
  /** Resolves the period window containing `reference`. */
  resolve(period: RankingPeriod, reference: Date = new Date()): PeriodRange {
    const day = startOfUtcDay(reference);
    const year = day.getUTCFullYear();
    const month = day.getUTCMonth();

    switch (period) {
      case 'DAILY':
        return { period, start: day, end: day };
      case 'WEEKLY': {
        // ISO week: Monday .. Sunday
        const weekday = (day.getUTCDay() + 6) % 7;
        const start = addDays(day, -weekday);
        return { period, start, end: addDays(start, 6) };
      }
      case 'MONTHLY': {
        const start = new Date(Date.UTC(year, month, 1));
        const end = new Date(Date.UTC(year, month + 1, 0));
        return { period, start, end };
      }
      case 'QUARTERLY': {
        const quarterStartMonth = Math.floor(month / 3) * 3;
        const start = new Date(Date.UTC(year, quarterStartMonth, 1));
        const end = new Date(Date.UTC(year, quarterStartMonth + 3, 0));
        return { period, start, end };
      }
      case 'YEARLY':
        return {
          period,
          start: new Date(Date.UTC(year, 0, 1)),
          end: new Date(Date.UTC(year, 11, 31)),
        };
      default:
        return { period, start: day, end: day };
    }
  },

  /** The window immediately before the one containing `reference`. */
  previous(period: RankingPeriod, reference: Date = new Date()): PeriodRange {
    const current = PeriodUtil.resolve(period, reference);
    return PeriodUtil.resolve(period, addDays(current.start, -1));
  },

  /** An explicit from/to range, defaulting to the last `defaultDays` days. */
  range(
    from?: string | Date,
    to?: string | Date,
    defaultDays = 30,
  ): { start: Date; end: Date } {
    const end = to ? startOfUtcDay(new Date(to)) : startOfUtcDay(new Date());
    const start = from
      ? startOfUtcDay(new Date(from))
      : addDays(end, -(defaultDays - 1));
    return start > end ? { start: end, end: start } : { start, end };
  },

  /** Every UTC day in the inclusive range, used to fill gaps in trend series. */
  eachDay(start: Date, end: Date): Date[] {
    const days: Date[] = [];
    for (
      let cursor = startOfUtcDay(start);
      cursor <= end;
      cursor = addDays(cursor, 1)
    ) {
      days.push(cursor);
    }
    return days;
  },

  toDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  },

  startOfUtcDay,
  addDays,
};

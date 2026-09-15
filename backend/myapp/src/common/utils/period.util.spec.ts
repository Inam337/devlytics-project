import { PeriodUtil } from './period.util';

describe('PeriodUtil', () => {
  it('resolves a monthly window to the first and last day of that month', () => {
    const { start, end } = PeriodUtil.resolve('MONTHLY', new Date('2026-02-15T12:00:00Z'));
    expect(PeriodUtil.toDateOnly(start)).toBe('2026-02-01');
    expect(PeriodUtil.toDateOnly(end)).toBe('2026-02-28');
  });

  it('resolves a weekly window to Monday..Sunday', () => {
    // 2026-02-18 is a Wednesday.
    const { start, end } = PeriodUtil.resolve('WEEKLY', new Date('2026-02-18T00:00:00Z'));
    expect(start.getUTCDay()).toBe(1);
    expect(end.getUTCDay()).toBe(0);
  });

  it('resolves a quarterly window to the containing quarter', () => {
    const { start, end } = PeriodUtil.resolve('QUARTERLY', new Date('2026-08-01T00:00:00Z'));
    expect(PeriodUtil.toDateOnly(start)).toBe('2026-07-01');
    expect(PeriodUtil.toDateOnly(end)).toBe('2026-09-30');
  });

  it('computes the previous period relative to the current one', () => {
    const current = PeriodUtil.resolve('MONTHLY', new Date('2026-03-10T00:00:00Z'));
    const previous = PeriodUtil.previous('MONTHLY', new Date('2026-03-10T00:00:00Z'));
    expect(PeriodUtil.toDateOnly(previous.start)).toBe('2026-02-01');
    expect(previous.end.getTime()).toBeLessThan(current.start.getTime());
  });

  it('defaults an explicit range to the trailing N days when omitted', () => {
    const { start, end } = PeriodUtil.range(undefined, '2026-01-30', 30);
    expect(PeriodUtil.toDateOnly(end)).toBe('2026-01-30');
    expect(PeriodUtil.toDateOnly(start)).toBe('2026-01-01');
  });

  it('enumerates every UTC day in an inclusive range', () => {
    const days = PeriodUtil.eachDay(new Date('2026-01-01'), new Date('2026-01-03'));
    expect(days.map((d) => PeriodUtil.toDateOnly(d))).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
  });
});

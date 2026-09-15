import { Prisma } from '@prisma/client';
import { NumberUtil } from './number.util';

describe('NumberUtil', () => {
  it('converts Prisma.Decimal values to plain numbers', () => {
    expect(NumberUtil.toNumber(new Prisma.Decimal('42.50'))).toBe(42.5);
  });

  it('falls back for null/undefined', () => {
    expect(NumberUtil.toNumber(null)).toBe(0);
    expect(NumberUtil.toNumber(undefined, 7)).toBe(7);
  });

  it('clamps scores to the 0..100 domain', () => {
    expect(NumberUtil.clampScore(-10)).toBe(0);
    expect(NumberUtil.clampScore(150)).toBe(100);
    expect(NumberUtil.clampScore(42.456)).toBe(42.46);
  });

  it('normalizes with saturation at the reference value', () => {
    expect(NumberUtil.normalize(5, 10)).toBe(50);
    expect(NumberUtil.normalize(20, 10)).toBe(100);
    expect(NumberUtil.normalize(5, 0)).toBe(0);
  });

  it('normalizes inversely so lower raw values score higher', () => {
    expect(NumberUtil.normalizeInverse(0, 10)).toBe(100);
    expect(NumberUtil.normalizeInverse(10, 10)).toBe(0);
    expect(NumberUtil.normalizeInverse(5, 0)).toBe(100);
  });

  it('averages an empty list to zero rather than NaN', () => {
    expect(NumberUtil.average([])).toBe(0);
    expect(NumberUtil.average([10, 20, 30])).toBe(20);
  });
});

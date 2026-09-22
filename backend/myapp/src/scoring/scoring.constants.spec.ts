import {
  DEFAULT_SCORING_WEIGHTS,
  REQUIRED_WEIGHT_TOTAL,
  SCORE_CATEGORIES,
} from './scoring.constants';

describe('scoring.constants', () => {
  it('the default weight configuration totals exactly 100%', () => {
    const total = Object.values(DEFAULT_SCORING_WEIGHTS).reduce(
      (sum, weight) => sum + weight,
      0,
    );
    expect(total).toBe(REQUIRED_WEIGHT_TOTAL);
  });

  it('defines all eight documented categories exactly once', () => {
    expect(SCORE_CATEGORIES).toHaveLength(8);
    expect(new Set(SCORE_CATEGORIES).size).toBe(8);
  });

  it('never assigns lines-of-code any weight — it is an activity metric only', () => {
    expect(Object.keys(DEFAULT_SCORING_WEIGHTS)).not.toContain('LOC');
    expect(Object.keys(DEFAULT_SCORING_WEIGHTS)).not.toContain('LINES_OF_CODE');
  });
});

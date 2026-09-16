import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DEFAULT_SCORING_WEIGHTS, SCORE_CATEGORIES } from '../scoring.constants';
import { SetScoringWeightsDto } from './scoring.dto';

function validPayload() {
  return {
    categories: SCORE_CATEGORIES.map((category) => ({
      category,
      weightPercent: DEFAULT_SCORING_WEIGHTS[category],
    })),
    reason: 'quarterly review',
  };
}

describe('SetScoringWeightsDto', () => {
  it('accepts a well-formed payload with all eight categories', async () => {
    const dto = plainToInstance(SetScoringWeightsDto, validPayload());
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts a payload without an optional reason', async () => {
    const payload = validPayload();
    delete (payload as { reason?: string }).reason;
    const dto = plainToInstance(SetScoringWeightsDto, payload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects an unknown category', async () => {
    const payload = validPayload();
    payload.categories[0] = { category: 'NOT_A_CATEGORY' as never, weightPercent: 25 };
    const dto = plainToInstance(SetScoringWeightsDto, payload);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a weight outside 0..100', async () => {
    const payload = validPayload();
    payload.categories[0] = { ...payload.categories[0], weightPercent: 150 };
    const dto = plainToInstance(SetScoringWeightsDto, payload);
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'categories')).toBe(true);
  });

  it('rejects a non-numeric weight', async () => {
    const payload = validPayload();
    payload.categories[0] = { ...payload.categories[0], weightPercent: 'a lot' as never };
    const dto = plainToInstance(SetScoringWeightsDto, payload);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects an empty categories array', async () => {
    const dto = plainToInstance(SetScoringWeightsDto, { categories: [] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'categories')).toBe(true);
  });

  it('rejects a reason longer than 500 characters', async () => {
    const payload = { ...validPayload(), reason: 'x'.repeat(501) };
    const dto = plainToInstance(SetScoringWeightsDto, payload);
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'reason')).toBe(true);
  });

  it('note: total-must-equal-100 is enforced by ScoringService.setWeights, not by this DTO', async () => {
    const payload = validPayload();
    payload.categories[0] = { ...payload.categories[0], weightPercent: 0 }; // total no longer 100
    const dto = plainToInstance(SetScoringWeightsDto, payload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RankingsQueryDto } from './rankings-query.dto';

describe('RankingsQueryDto', () => {
  it('accepts an empty query and applies pagination defaults', async () => {
    const dto = plainToInstance(RankingsQueryDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
    expect(dto.skip).toBe(0);
  });

  it('accepts a fully-specified query', async () => {
    const dto = plainToInstance(RankingsQueryDto, {
      period: 'WEEKLY',
      date: '2026-03-10T00:00:00.000Z',
      teamId: '11111111-1111-4111-8111-111111111111',
      departmentId: '22222222-2222-4222-8222-222222222222',
      userId: '33333333-3333-4333-8333-333333333333',
      subjectType: 'TEAM',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects an invalid period', async () => {
    const dto = plainToInstance(RankingsQueryDto, { period: 'FORTNIGHTLY' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'period')).toBe(true);
  });

  it('rejects a non-ISO8601 date', async () => {
    const dto = plainToInstance(RankingsQueryDto, { date: '10 March 2026' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'date')).toBe(true);
  });

  it('rejects a non-UUID teamId, departmentId or userId', async () => {
    for (const field of ['teamId', 'departmentId', 'userId']) {
      const dto = plainToInstance(RankingsQueryDto, { [field]: 'not-a-uuid' });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === field)).toBe(true);
    }
  });

  it('rejects an invalid subjectType', async () => {
    const dto = plainToInstance(RankingsQueryDto, {
      subjectType: 'ORGANIZATION',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'subjectType')).toBe(true);
  });

  it('computes skip from page and limit', () => {
    const dto = plainToInstance(RankingsQueryDto, { page: 3, limit: 10 });
    expect(dto.skip).toBe(20);
  });
});

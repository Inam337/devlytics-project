import { QueryUtil } from './query.util';

describe('QueryUtil', () => {
  it('builds an orderBy clause from an allowed sort field', () => {
    expect(
      QueryUtil.orderBy(
        'name',
        'asc',
        ['name', 'createdAt'] as const,
        'createdAt',
      ),
    ).toEqual({
      name: 'asc',
    });
  });

  it('falls back to the default sort field when none is given', () => {
    expect(
      QueryUtil.orderBy(
        undefined,
        'desc',
        ['name', 'createdAt'] as const,
        'createdAt',
      ),
    ).toEqual({
      createdAt: 'desc',
    });
  });

  it('rejects a sort field that is not in the allow-list', () => {
    expect(() =>
      QueryUtil.orderBy('password', 'asc', ['name'] as const, 'name'),
    ).toThrow();
  });

  it('builds a case-insensitive OR-contains search clause across fields', () => {
    expect(QueryUtil.search('ada', ['name', 'email'])).toEqual({
      OR: [
        { name: { contains: 'ada', mode: 'insensitive' } },
        { email: { contains: 'ada', mode: 'insensitive' } },
      ],
    });
  });

  it('omits the search clause entirely when no term is given', () => {
    expect(QueryUtil.search(undefined, ['name'])).toBeUndefined();
  });

  it('drops null and undefined entries from a filter object', () => {
    expect(QueryUtil.compact({ a: 1, b: undefined, c: null, d: 'x' })).toEqual({
      a: 1,
      d: 'x',
    });
  });
});

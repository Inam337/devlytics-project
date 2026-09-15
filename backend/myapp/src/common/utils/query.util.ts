import { AppException } from '../exceptions/app.exception';

/**
 * Shared list-query helpers. Sorting is whitelisted per resource so a client
 * cannot order by an arbitrary column, and search terms are turned into a single
 * `OR contains` clause instead of each module hand-rolling one.
 */
export const QueryUtil = {
  orderBy<T extends string>(
    sortBy: string | undefined,
    sortOrder: 'asc' | 'desc',
    allowed: readonly T[],
    fallback: T,
  ): Record<string, 'asc' | 'desc'> {
    if (sortBy && !allowed.includes(sortBy as T)) {
      throw AppException.badRequest(
        `Cannot sort by '${sortBy}'. Allowed values: ${allowed.join(', ')}`,
      );
    }
    return { [sortBy ?? fallback]: sortOrder };
  },

  search(term: string | undefined, fields: readonly string[]): Record<string, unknown> | undefined {
    if (!term) return undefined;
    return {
      OR: fields.map((field) => ({
        [field]: { contains: term, mode: 'insensitive' },
      })),
    };
  },

  /** Drops undefined entries so optional filters never widen a Prisma `where`. */
  compact<T extends Record<string, unknown>>(input: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined && value !== null),
    ) as Partial<T>;
  },
};

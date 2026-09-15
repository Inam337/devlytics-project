/**
 * Stable machine-readable error codes returned in the `code` field of every
 * error response. Clients switch on these, never on message text.
 */
export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  FORBIDDEN: 'FORBIDDEN',
  TENANT_MISMATCH: 'TENANT_MISMATCH',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  UNPROCESSABLE: 'UNPROCESSABLE_ENTITY',
  RATE_LIMITED: 'RATE_LIMITED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  FOREIGN_KEY_VIOLATION: 'FOREIGN_KEY_VIOLATION',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  WEBHOOK_SIGNATURE_INVALID: 'WEBHOOK_SIGNATURE_INVALID',
  AI_PROVIDER_UNAVAILABLE: 'AI_PROVIDER_UNAVAILABLE',
  SCORING_WEIGHTS_INVALID: 'SCORING_WEIGHTS_INVALID',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Resource-specific not-found codes, e.g. `REPOSITORY_NOT_FOUND`. */
export const notFoundCode = (resource: string): string =>
  `${resource.replace(/[\s-]+/g, '_').toUpperCase()}_NOT_FOUND`;

/** Resource-specific conflict codes, e.g. `TEAM_ALREADY_EXISTS`. */
export const conflictCode = (resource: string): string =>
  `${resource.replace(/[\s-]+/g, '_').toUpperCase()}_ALREADY_EXISTS`;

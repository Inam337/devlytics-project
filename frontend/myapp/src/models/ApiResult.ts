import type { ApiError } from '@/types/api-error';

/** Typed success/failure result for domain services (auth uses `AuthResult` with string errors). */
export type ApiResult<T>
  = | { ok: true; data: T }
    | { ok: false; error: ApiError };

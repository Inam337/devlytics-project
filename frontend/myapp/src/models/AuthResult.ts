export type AuthResult<T>
  = | { ok: true; data: T }
    | { ok: false; error: string };

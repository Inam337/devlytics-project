import type { AuthLoginResponse } from './AuthLoginResponse';

/** @deprecated Use AuthLoginResponse — backend returns `token` and `refreshToken` */
export type LoginRes = AuthLoginResponse;

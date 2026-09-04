/** Matches backend POST /auth/refresh-token success body */
export interface AuthRefreshResponse {
  token: string;
  refreshToken: string;
}

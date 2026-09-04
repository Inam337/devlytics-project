export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  status?: boolean;
}

/** Matches backend POST /auth/login and /auth/register success body */
export interface AuthLoginResponse {
  success: boolean;
  message: string;
  user: AuthUser;
  token: string;
  refreshToken: string;
}

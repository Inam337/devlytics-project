/**
 * Matches backend AuthService's identity shape — returned by /auth/login,
 * /auth/register, /auth/refresh, /auth/accept-invitation and (minus tokens)
 * /auth/me.
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl: string | null;
  status: string;
}

export interface AuthOrganization {
  id: string;
  name: string;
  slug: string;
}

export interface AuthRole {
  id: string;
  key: string;
  name: string;
}

export interface AuthIdentity {
  user: AuthUser;
  organization: AuthOrganization;
  role: AuthRole;
  permissions: string[];
}

/** Full session body returned by login/register/refresh/accept-invitation */
export interface AuthSession extends AuthIdentity {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  tokenType: 'Bearer';
}

/** Body for POST /auth/register */
export interface RegisterRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  organization: {
    name: string;
  };
}

/** Body for POST /auth/login */
export interface LoginRequest {
  email: string;
  password: string;
  organizationId?: string;
}

/** Body for POST /auth/forgot-password */
export interface ForgotPasswordRequest {
  email: string;
}

/** Body for POST /auth/reset-password */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

/** Body for POST /auth/accept-invitation */
export interface AcceptInvitationRequest {
  email: string;
  password: string;
  organizationId: string;
}

/** Body for POST /auth/change-password */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

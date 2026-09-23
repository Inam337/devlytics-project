import { AppConstants } from '@/common/AppConstants';
import { apiClient } from '@/libs/axios';
import type {
  AcceptInvitationRequest,
  AuthIdentity,
  AuthResult,
  AuthSession,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '@/models';
import { isApiError, parseApiError } from '@/types/api-error';

function toAuthError(error: unknown, fallback: string): string {
  const parsed = parseApiError(error);

  if (parsed.status === 401) {
    if (parsed.message.toLowerCase().includes('inactive')) {
      return 'auth.login.errors.inactiveAccount';
    }

    if (parsed.message.toLowerCase().includes('current password')) {
      return 'auth.profile.errors.incorrectCurrentPassword';
    }

    return 'auth.login.errors.invalidCredentials';
  }

  if (parsed.status === 409) {
    return 'auth.register.errors.emailExists';
  }

  if (parsed.status === 500) {
    return 'auth.register.errors.generic';
  }

  if (parsed.status === 0) {
    return parsed.message;
  }

  return parsed.message || fallback;
}

async function callAuth<T>(
  request: () => Promise<T>,
  fallback: string,
): Promise<AuthResult<T>> {
  try {
    return { ok: true, data: await request() };
  } catch (error) {
    if (import.meta.env.DEV && !isApiError(error)) {
      console.warn('[auth] request failed:', error);
    }

    return { ok: false, error: toAuthError(error, fallback) };
  }
}

export const login = async (
  payload: LoginRequest,
): Promise<AuthResult<AuthSession>> =>
  callAuth(
    async () =>
      (
        await apiClient.post<AuthSession>(AppConstants.ApiUrls.Login, payload, {
          skipAuth: true,
        })
      ).data,
    'auth.login.errors.invalidCredentials',
  );

export const register = async (
  payload: RegisterRequest,
): Promise<AuthResult<AuthSession>> =>
  callAuth(
    async () =>
      (
        await apiClient.post<AuthSession>(AppConstants.ApiUrls.Register, payload, {
          skipAuth: true,
        })
      ).data,
    'auth.register.errors.generic',
  );

export const me = async (): Promise<AuthResult<AuthIdentity>> =>
  callAuth(
    async () => (await apiClient.get<AuthIdentity>(AppConstants.ApiUrls.Me)).data,
    AppConstants.Strings.Errors.Global,
  );

export const logout = async (refreshToken?: string | null): Promise<AuthResult<{ loggedOut: boolean }>> =>
  callAuth(
    async () =>
      (
        await apiClient.post<{ loggedOut: boolean }>(
          AppConstants.ApiUrls.Logout,
          refreshToken ? { refreshToken } : {},
        )
      ).data,
    AppConstants.Strings.Errors.Global,
  );

export const forgotPassword = async (
  payload: ForgotPasswordRequest,
): Promise<AuthResult<{ requested: boolean }>> =>
  callAuth(
    async () =>
      (
        await apiClient.post<{ requested: boolean }>(
          AppConstants.ApiUrls.ForgotPassword,
          payload,
          { skipAuth: true },
        )
      ).data,
    AppConstants.Strings.Errors.Global,
  );

export const resetPassword = async (
  payload: ResetPasswordRequest,
): Promise<AuthResult<{ reset: boolean }>> =>
  callAuth(
    async () =>
      (
        await apiClient.post<{ reset: boolean }>(
          AppConstants.ApiUrls.ResetPassword,
          payload,
          { skipAuth: true },
        )
      ).data,
    'auth.resetPassword.errors.generic',
  );

export const acceptInvitation = async (
  payload: AcceptInvitationRequest,
): Promise<AuthResult<AuthSession>> =>
  callAuth(
    async () =>
      (
        await apiClient.post<AuthSession>(
          AppConstants.ApiUrls.AcceptInvitation,
          payload,
          { skipAuth: true },
        )
      ).data,
    'auth.acceptInvitation.errors.generic',
  );

export const changePassword = async (
  payload: ChangePasswordRequest,
): Promise<AuthResult<{ changed: boolean }>> =>
  callAuth(
    async () =>
      (
        await apiClient.post<{ changed: boolean }>(
          AppConstants.ApiUrls.ChangePassword,
          payload,
        )
      ).data,
    AppConstants.Strings.Errors.Global,
  );

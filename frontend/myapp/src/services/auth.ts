import { AppConstants } from '@/common/AppConstants';
import { apiClient } from '@/libs/axios';
import type {
  AuthLoginResponse,
  AuthRefreshResponse,
  AuthResult,
  ChangePasswordRequest,
  RegisterRequest,
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

export const login = async (
  email: string,
  password: string,
): Promise<AuthResult<AuthLoginResponse>> => {
  try {
    const response = await apiClient.post<AuthLoginResponse>(
      AppConstants.ApiUrls.Login,
      { email, password },
      { skipAuth: true },
    );

    return { ok: true, data: response.data };
  } catch (error) {
    if (import.meta.env.DEV && !isApiError(error)) {
      console.warn('[auth] login failed:', error);
    }

    return {
      ok: false,
      error: toAuthError(error, 'auth.login.errors.invalidCredentials'),
    };
  }
};

export const register = async (
  payload: RegisterRequest,
): Promise<AuthResult<AuthLoginResponse>> => {
  try {
    const response = await apiClient.post<AuthLoginResponse>(
      AppConstants.ApiUrls.Register,
      payload,
      { skipAuth: true },
    );

    return { ok: true, data: response.data };
  } catch (error) {
    return {
      ok: false,
      error: toAuthError(error, 'auth.register.errors.generic'),
    };
  }
};

export const refreshAccessToken = async (
  refreshToken: string,
): Promise<AuthResult<AuthRefreshResponse>> => {
  try {
    const response = await apiClient.post<AuthRefreshResponse>(
      AppConstants.ApiUrls.RefreshToken,
      { refreshToken },
      { skipAuth: true, skipRefreshRetry: true },
    );

    return { ok: true, data: response.data };
  } catch (error) {
    return {
      ok: false,
      error: toAuthError(error, AppConstants.Strings.Errors.Global),
    };
  }
};

export const changePassword = async (
  payload: ChangePasswordRequest,
): Promise<AuthResult<{ message: string }>> => {
  try {
    const response = await apiClient.post<{ message: string }>(
      AppConstants.ApiUrls.ChangePassword,
      payload,
    );

    return { ok: true, data: response.data };
  } catch (error) {
    return {
      ok: false,
      error: toAuthError(error, AppConstants.Strings.Errors.Global),
    };
  }
};

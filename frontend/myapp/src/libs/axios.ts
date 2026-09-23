import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

import { AppConstants } from '@/common/AppConstants';
import { getApiBaseUrl } from '@/libs/api-config';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '@/libs/auth-tokens';
import { requestTokenRefresh } from '@/libs/refresh-token-request';
import type { AuthSession } from '@/models';
import { parseApiError } from '@/types/api-error';

export { clearTokens, getAccessToken, setTokens } from '@/libs/auth-tokens';
export { parseApiError } from '@/types/api-error';
export type { ApiError } from '@/types/api-error';

type QueueItem = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

let isRefreshing = false;
let refreshQueue: QueueItem[] = [];
const flushRefreshQueue = (error: unknown | null, token: string | null = null) => {
  refreshQueue.forEach((item) => {
    if (error) {
      item.reject(error);
    } else if (token) {
      item.resolve(token);
    }
  });
  refreshQueue = [];
};

const redirectToLogin = () => {
  clearTokens();

  const loginPath = AppConstants.Routes.Public.Login;

  if (!window.location.pathname.startsWith(loginPath)) {
    window.location.assign(loginPath);
  }
};

/** Refresh returns a full session (tokens + identity), not just a token pair — apply all of it. */
const applyRefreshedSession = async (session: AuthSession): Promise<void> => {
  setTokens(session.accessToken, session.refreshToken);

  const { useAuthStore } = await import('@/stores/auth');

  useAuthStore.getState().setSession(session);
};

const onRequest = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  if (!config.skipAuth) {
    const token = getAccessToken();

    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return config;
};

const onRequestError = (error: unknown): Promise<never> => Promise.reject(error);
/**
 * Every backend success response is wrapped `{ success, data, message, pagination? }`
 * (see ResponseInterceptor in the backend) — unwrap `data` here so every service
 * function can type `response.data` as the real payload instead of the envelope.
 */
const onResponse = (response: AxiosResponse): AxiosResponse => {
  const body = response.data as { data?: unknown } | undefined;

  if (body && typeof body === 'object' && 'data' in body) {
    response.data = body.data;
  }

  return response;
};

const createResponseErrorHandler = (instance: AxiosInstance) => {
  return async (error: unknown): Promise<never> => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(parseApiError(error));
    }

    const originalRequest = error.config as InternalAxiosRequestConfig | undefined;

    if (
      !originalRequest
      || originalRequest.skipAuth
      || originalRequest.skipRefreshRetry
      || originalRequest._retry
    ) {
      if (!originalRequest?.skipAuth) {
        redirectToLogin();
      }

      return Promise.reject(parseApiError(error));
    }

    const storedRefresh = getRefreshToken();

    if (!storedRefresh) {
      redirectToLogin();

      return Promise.reject(parseApiError(error));
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.set('Authorization', `Bearer ${token}`);
        originalRequest._retry = true;

        return instance(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const session = await requestTokenRefresh(storedRefresh);

      await applyRefreshedSession(session);
      flushRefreshQueue(null, session.accessToken);
      originalRequest.headers.set('Authorization', `Bearer ${session.accessToken}`);

      return instance(originalRequest);
    } catch (refreshError) {
      flushRefreshQueue(refreshError);
      redirectToLogin();

      return Promise.reject(parseApiError(refreshError));
    } finally {
      isRefreshing = false;
    }
  };
};

export const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 30_000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  instance.interceptors.request.use(onRequest, onRequestError);
  instance.interceptors.response.use(onResponse, createResponseErrorHandler(instance));

  return instance;
};

export const apiClient = createAxiosInstance();

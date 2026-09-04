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

const applySessionTokens = async (
  accessToken: string,
  refreshToken: string,
): Promise<void> => {
  setTokens(accessToken, refreshToken);
  const { useAuthStore } = await import('@/stores/auth');
  const current = useAuthStore.getState();
  useAuthStore.getState().setSession({
    token: accessToken,
    refreshToken,
    user: current.user,
  });
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

const onResponse = (response: AxiosResponse): AxiosResponse => response;

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
      const { token, refreshToken } = await requestTokenRefresh(storedRefresh);
      await applySessionTokens(token, refreshToken);
      flushRefreshQueue(null, token);
      originalRequest.headers.set('Authorization', `Bearer ${token}`);
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

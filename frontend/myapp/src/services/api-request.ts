import type { AxiosRequestConfig } from 'axios';

import { apiClient } from '@/libs/axios';
import type { ApiResult } from '@/models/ApiResult';
import { parseApiError } from '@/types/api-error';

async function toResult<T>(request: () => Promise<{ data: T }>): Promise<ApiResult<T>> {
  try {
    const response = await request();

    return { ok: true, data: response.data };
  } catch (error) {
    return { ok: false, error: parseApiError(error) };
  }
}

export function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
  return toResult(() => apiClient.get<T>(url, config));
}

export function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<ApiResult<T>> {
  return toResult(() => apiClient.post<T>(url, body, config));
}

export function apiPut<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<ApiResult<T>> {
  return toResult(() => apiClient.put<T>(url, body, config));
}

export function apiPatch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<ApiResult<T>> {
  return toResult(() => apiClient.patch<T>(url, body, config));
}

export function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
  return toResult(() => apiClient.delete<T>(url, config));
}

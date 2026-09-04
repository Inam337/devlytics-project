import axios from 'axios';

export interface ApiError {
  status: number;
  message: string;
  details?: string[];
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object'
    && error !== null
    && 'status' in error
    && 'message' in error
    && typeof (error as ApiError).message === 'string'
  );
}

function messageFromBody(data: unknown): { message: string; details?: string[] } {
  if (data == null || typeof data !== 'object') {
    return { message: 'Request failed' };
  }

  const body = data as Record<string, unknown>;
  const raw = body.message;

  if (Array.isArray(raw)) {
    const details = raw.filter((m): m is string => typeof m === 'string');
    return {
      message: details[0] ?? 'Validation failed',
      details,
    };
  }

  if (typeof raw === 'string' && raw.length > 0) {
    return { message: raw };
  }

  if (typeof body.error === 'string') {
    return { message: body.error };
  }

  return { message: 'Request failed' };
}

export function parseApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return {
        status: 0,
        message:
          error.code === 'ERR_NETWORK'
            ? 'Cannot reach the API. Start the backend (cd backend/myapp && pnpm run start:dev), then restart the frontend (pnpm dev).'
            : error.message || 'Network request failed',
      };
    }

    const status = error.response.status;
    const { message, details } = messageFromBody(error.response.data);
    const apiMessage =
      message !== 'Request failed' ? message : `Request failed with status ${status}`;

    return { status, message: apiMessage, details };
  }

  if (error instanceof Error) {
    return { status: 0, message: error.message };
  }

  return { status: 0, message: 'Something went wrong. Please try again.' };
}

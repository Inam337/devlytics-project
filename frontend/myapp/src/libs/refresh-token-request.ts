import axios from 'axios';

import { AppConstants } from '@/common/AppConstants';
import { getApiBaseUrl } from '@/libs/api-config';
import type { AuthSession } from '@/models';

interface RawEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
}

/** Standalone refresh call — avoids axios ↔ auth service circular import */
export async function requestTokenRefresh(
  refreshToken: string,
): Promise<AuthSession> {
  const { data } = await axios.post<RawEnvelope<AuthSession>>(
    `${getApiBaseUrl()}${AppConstants.ApiUrls.RefreshToken}`,
    { refreshToken },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30_000,
    },
  );

  return data.data;
}

import axios from 'axios';

import { AppConstants } from '@/common/AppConstants';
import { getApiBaseUrl } from '@/libs/api-config';
import type { AuthRefreshResponse } from '@/models';

/** Standalone refresh call — avoids axios ↔ auth service circular import */
export async function requestTokenRefresh(
  refreshToken: string,
): Promise<AuthRefreshResponse> {
  const { data } = await axios.post<AuthRefreshResponse>(
    `${getApiBaseUrl()}${AppConstants.ApiUrls.RefreshToken}`,
    { refreshToken },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30_000,
    },
  );

  return data;
}

/** localStorage keys — single source of truth for axios Authorization header */
export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';

export const getAccessToken = (): string | null =>
  localStorage.getItem(ACCESS_TOKEN_KEY);

export const getRefreshToken = (): string | null =>
  localStorage.getItem(REFRESH_TOKEN_KEY);

export const setTokens = (accessToken: string, refreshToken?: string | null): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

export const clearTokens = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const hasAccessToken = (): boolean => getAccessToken() != null;

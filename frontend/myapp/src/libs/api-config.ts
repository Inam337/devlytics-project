/**
 * API base URL for axios.
 *
 * Development (recommended):
 *   VITE_API_BASE_URL=/api/v1 → same-origin via Vite proxy → localhost:3000/api/v1
 *
 * Development (direct / CORS):
 *   VITE_API_BASE_URL=http://localhost:3000/api/v1
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  const fromEnv = typeof raw === 'string' ? raw.trim() : '';

  if (fromEnv === '') {
    return import.meta.env.DEV ? '/api/v1' : '';
  }

  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }

  if (import.meta.env.DEV) {
    return '/api/v1';
  }

  throw new Error(
    'VITE_API_BASE_URL is required for production builds. Set it in .env.production.',
  );
}

export function isUsingDevProxy(): boolean {
  const base = getApiBaseUrl();

  return import.meta.env.DEV && (base === '' || base.startsWith('/'));
}

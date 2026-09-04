/**
 * API base URL for axios.
 *
 * Development (recommended):
 *   VITE_API_BASE_URL=   (empty) → same-origin requests via Vite proxy → localhost:3000
 *
 * Development (direct / CORS):
 *   VITE_API_BASE_URL=http://localhost:3000
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  const fromEnv = typeof raw === 'string' ? raw.trim() : '';

  // Explicit empty = use Vite dev proxy (see vite.config.ts)
  if (fromEnv === '') {
    return '';
  }

  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }

  if (import.meta.env.DEV) {
    return '';
  }

  throw new Error(
    'VITE_API_BASE_URL is required for production builds. Set it in .env.production.',
  );
}

export function isUsingDevProxy(): boolean {
  return import.meta.env.DEV && getApiBaseUrl() === '';
}

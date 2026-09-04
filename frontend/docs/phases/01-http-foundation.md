# Phase 1 — HTTP client and environment foundation

**Status:** ✅ Complete  
**Goal:** Single env variable, shared Axios client, unified token storage, centralized API paths.

---

## Context

Before Phase 1, `.env.development` used `VITE_BACKEND_API_URL` (unused) while code read `VITE_API_BASE_URL`. Phase 1 aligned everything to **`VITE_API_BASE_URL=http://localhost:3000`** (origin only — paths like `/auth/login` come from `AppConstants`).

---

## User stories

### US-1.1 — Align environment variables

- [x] `import.meta.env.VITE_API_BASE_URL` in dev and prod builds
- [x] `apiClient.defaults.baseURL` matches Scalar base (origin only)

### US-1.2 — Harden the Axios client

- [x] Missing `VITE_API_BASE_URL` fails fast in production (`getApiBaseUrl()`)
- [x] `skipAuth: true` omits Bearer on public routes
- [x] Authenticated requests send `Authorization: Bearer <accessToken>`
- [x] 401 clears session and redirects to login

### US-1.3 — Unify token persistence

- [x] Zustand `useAuthStore` + `persist`; tokens synced to `localStorage` (`access_token`, `refresh_token`)
- [x] Login stores `token` and `refreshToken` from backend field names
- [x] Logout clears store + tokens

### US-1.4 — Centralize API path constants

- [x] All paths in `AppConstants.ApiUrls` and `AppConstants.ApiUrlBuilders`
- [x] No raw `/auth/...` strings in page components

---

## Key files

| File | Role |
|------|------|
| `src/libs/api-config.ts` | Resolve `VITE_API_BASE_URL` |
| `src/libs/axios.ts` | `apiClient`, interceptors, 401 handling |
| `src/libs/auth-tokens.ts` | Read/write/clear tokens in localStorage |
| `src/common/AppConstants.ts` | `Routes`, `ApiUrls`, `ApiUrlBuilders` |
| `src/vite-env.d.ts` | Env type for `VITE_API_BASE_URL` |
| `.env.development` / `.env.production` | Env values |

---

## Env template

```env
# Development — no /api/v1 prefix
VITE_API_BASE_URL=http://localhost:3000
```

---

## Verify

- Login network tab shows `{VITE_API_BASE_URL}/auth/login`
- After login, `GET /cart` includes Bearer header
- Page reload keeps session

---

## Next phase

→ [02-authentication.md](./02-authentication.md)

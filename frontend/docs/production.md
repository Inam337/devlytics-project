# Production deployment

How to build and deploy **`frontend/myapp`** against a live Nest API. Dev setup: [dev-setup.md](./dev-setup.md).

---

## Environment variables

| Variable | Where | Required | Example |
|----------|-------|----------|---------|
| `VITE_API_BASE_URL` | Frontend **build time** (`.env.production` or CI env) | **Yes** for production | `https://api.zentro.example.com` |
| `CORS_ORIGINS` | Backend runtime (`.env`) | **Yes** for browser SPA | `https://app.zentro.example.com` |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Backend runtime | Yes | See `backend/myapp/.env.example` |
| `DB_*` | Backend runtime | Yes | PostgreSQL connection |

**Rules**

- `VITE_*` values are **inlined at build time** — change API URL → **rebuild** the SPA.
- No `/api/v1` prefix on Nest today; base URL is the server origin (e.g. `https://api.example.com`).
- Dev proxy (`VITE_API_BASE_URL` empty) is **not** used in production builds — `getApiBaseUrl()` throws if unset.

---

## Frontend build

```bash
cd frontend/myapp
pnpm install

# Set API origin for this deployment
echo "VITE_API_BASE_URL=https://api.your-domain.com" > .env.production

# Production bundle → dist/
pnpm run build:prod
# or full typecheck + build:
pnpm run build
```

**Verify build embeds API URL:**

```bash
VITE_API_BASE_URL=https://api.staging.example.com pnpm run verify:build
```

**Preview locally** (serves `dist/` on port 4173 — add to backend `CORS_ORIGINS`):

```bash
pnpm run preview
```

Deploy the **`dist/`** folder to any static host (S3 + CloudFront, Nginx, Vercel static, etc.).

---

## Backend CORS

In `backend/myapp/.env`:

```env
CORS_ORIGINS=https://app.your-domain.com,https://www.your-domain.com
```

Restart the API after changing `CORS_ORIGINS`.

---

## Staging / production smoke test

With API running and demo seed loaded:

```bash
cd frontend/myapp

# Local
pnpm run verify:regression

# Staging
API_BASE=https://api.staging.example.com pnpm run verify:regression
```

Covers: auth, refresh, commerce checkout + COD payment, admin CRUD, 400 validation, 401 without JWT.

---

## CI (GitHub Actions)

Workflow: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)

| Job | What it does |
|-----|----------------|
| `frontend-build` | `vite build` with `VITE_API_BASE_URL`; asserts URL in bundle |
| `api-regression` | PostgreSQL service → Nest API → `seed:demo` → `verify:regression` |

Set repository variable or workflow env for your staging API if you add a deploy pipeline later.

---

## Checklist before go-live

- [ ] `VITE_API_BASE_URL` points to production API (HTTPS)
- [ ] `CORS_ORIGINS` includes production SPA origin(s)
- [ ] JWT secrets rotated from `.env.example` defaults
- [ ] `pnpm run verify:build` passes in CI
- [ ] `pnpm run verify:regression` passes against staging
- [ ] Manual UI pass: [regression.md](./regression.md)

---

## Related

- [regression.md](./regression.md) — manual QA checklist
- [routes.md](./routes.md) — SPA route map
- [architecture.md](./architecture.md) — Phase 7 acceptance criteria

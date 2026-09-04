# Phase 0 — Prerequisites and verification

**Status:** ✅ Complete  
**Goal:** Backend and frontend run locally; cross-origin strategy decided; team can hit Scalar and the Vite app before wiring features.

---

## Context

Phase 0 establishes the development environment. Zentro uses **NestJS CORS (Option A)** — the browser calls `http://localhost:3000` directly from `http://localhost:5173`. There is **no Vite proxy** and **no `/api/v1` global prefix** on the Nest app today.

---

## User stories

### US-0.1 — Run backend locally

- [x] PostgreSQL and `.env` configured per `backend/myapp/.env.example`
- [x] `pnpm run start:dev` succeeds; `GET http://localhost:3000/` returns hello
- [x] Scalar at `http://localhost:3000/reference`
- [ ] Manual: register → login → `GET /cart` in Scalar (use demo user — see [seed.md](../seed.md))

### US-0.2 — Run frontend locally

- [x] `pnpm dev` from `frontend/myapp`
- [x] App at `http://localhost:5173`
- [x] `VITE_API_BASE_URL=http://localhost:3000` in `.env.development`

### US-0.3 — Document cross-origin strategy

| Environment | Approach |
|-------------|----------|
| Development | `app.enableCors()` — origins `localhost:5173`, `127.0.0.1:5173`, `localhost:4173` |
| Production | `CORS_ORIGINS` on API; `VITE_API_BASE_URL` at frontend build time |

- [x] Documented in [dev-setup.md](../dev-setup.md)

---

## Key files

| Area | Path |
|------|------|
| Backend entry | `backend/myapp/src/main.ts` (CORS) |
| Frontend env | `frontend/myapp/.env.development` |
| Dev runbook | [dev-setup.md](../dev-setup.md) |

---

## Verify

```bash
cd backend/myapp && pnpm run start:dev
cd frontend/myapp && pnpm dev
```

| Check | URL |
|-------|-----|
| API health | http://localhost:3000/ |
| Scalar | http://localhost:3000/reference |
| SPA | http://localhost:5173 |

---

## Next phase

→ [01-http-foundation.md](./01-http-foundation.md)

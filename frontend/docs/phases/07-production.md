# Phase 7 — Production, quality, and observability

**Status:** ✅ Complete  
**Goal:** Production builds embed the correct API URL; repeatable regression checks; CI runs verify scripts.

---

## Context

Full `pnpm run build` (with `tsc -b`) may fail on legacy UI dependencies — **`pnpm run verify:build`** runs Vite production build only and is the release gate. Regression script hits the live API (local or staging via `API_BASE`).

---

## User stories

### US-7.1 — Production build and env

- [x] `VITE_API_BASE_URL` required at build time
- [x] `scripts/verify-production-build.mjs` — build + assert URL in bundle
- [x] `getApiBaseUrl()` throws if missing in production
- [x] GitHub Actions `frontend-build` job

**Docs:** [production.md](../production.md)

### US-7.2 — Contract testing / regression

- [x] `scripts/verify-regression.mjs` — automated API happy path
- [x] Manual UI matrix in [regression.md](../regression.md)
- [x] CI `api-regression` job against seeded API

**Automated regression covers:**

1. Login / refresh / invalid credentials  
2. List products → add to cart → checkout → pay (COD)  
3. Admin: create category → product → stock  
4. Validation error on bad DTO (400)  
5. 401 on `GET /cart` without JWT  

---

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm run verify:build` | Production Vite build + URL check |
| `pnpm run verify:regression` | API integration smoke (needs running API) |
| `pnpm run verify:seed` | Assert demo seed counts |
| `pnpm run verify:auth` | Auth-only checks (if configured) |

From `frontend/myapp`. Seed commands live in `backend/myapp` — see [seed.md](../seed.md).

---

## Key files

| Path | Role |
|------|------|
| `scripts/verify-production-build.mjs` | Build gate |
| `scripts/verify-regression.mjs` | API regression |
| `scripts/verify-seed.mjs` | Seed verification |
| `.github/workflows/ci.yml` | CI pipeline |
| `docs/production.md` | Deploy notes |
| `docs/regression.md` | Manual + auto checklist |

---

## CI overview

- **frontend-build** — `verify:build` with staging `VITE_API_BASE_URL`
- **api-regression** — backend up + seed + `verify:regression`

---

## Verify locally

```bash
# Terminal 1
cd backend/myapp && pnpm run seed:demo && pnpm run start:dev

# Terminal 2
cd frontend/myapp
pnpm run verify:seed
pnpm run verify:regression
pnpm run verify:build
```

---

## Next (optional)

→ [08-enhancements.md](./08-enhancements.md)  
→ Demo data: [seed.md](../seed.md)

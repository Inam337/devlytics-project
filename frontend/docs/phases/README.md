# Zentro frontend — implementation phases

Persistent context for each integration phase: goals, what was built, key files, verification commands, and links to deeper docs.

**Master plan (user stories):** [`../architecture.md`](../architecture.md)  
**Local setup:** [`../dev-setup.md`](../dev-setup.md)

---

## Phase summary

| Phase | Name | Status | Doc |
|-------|------|--------|-----|
| 0 | Prerequisites & verification | ✅ Complete | [00-prerequisites.md](./00-prerequisites.md) |
| 1 | HTTP client & environment | ✅ Complete | [01-http-foundation.md](./01-http-foundation.md) |
| 2 | Authentication & session | ✅ Complete | [02-authentication.md](./02-authentication.md) |
| 3 | API layer scaffolding | ✅ Complete | [03-api-layer.md](./03-api-layer.md) |
| 4 | Commerce flows (storefront) | ✅ Complete | [04-commerce.md](./04-commerce.md) |
| 5 | Admin / inventory | ✅ Complete | [05-admin.md](./05-admin.md) |
| 6 | Routing & navigation | ✅ Complete | [06-routing.md](./06-routing.md) |
| 7 | Production & quality | ✅ Complete | [07-production.md](./07-production.md) |
| — | Demo seed (cross-cutting) | ✅ Complete | [../seed.md](../seed.md) |
| 8 | Nice-to-have enhancements | 🟡 Partial (i18n done) | [08-enhancements.md](./08-enhancements.md) |
| — | Branding (favicon, auth, sidebar) | ✅ Complete | [../branding.md](../branding.md) |
| — | UI refactor (theme, DataTable, drawer) | 🟡 In progress | [../ui-refactor-plan.md](../ui-refactor-plan.md) |

---

## Suggested order (completed path)

```text
Phase 0  → Backend + frontend running, CORS decided
Phase 1  → VITE_API_BASE_URL, axios, tokens, AppConstants
Phase 2  → Login / register / refresh / profile password
Phase 3  → Models + services for all domains
Phase 4  → Catalog → cart → checkout → orders → payments
Phase 5  → Admin CRUD: categories, products, stock, suppliers, purchases, sales, customers, users
Phase 6  → Routes, sidebar, role guards, deep links
Phase 7  → Production build verify, regression scripts, CI
Seed     → pnpm run seed:demo + verify:seed
Phase 8  → Optional: i18n ✅; search, images, PWA, E2E, …
```

---

## Quick verification (full stack)

```bash
# Backend
cd backend/myapp
docker compose up -d db          # from repo root if needed
pnpm run seed:demo
pnpm run start:dev

# Frontend
cd frontend/myapp
pnpm dev
pnpm run verify:seed            # API must be up
pnpm run verify:regression      # API must be up + seeded
pnpm run verify:build
```

**Demo logins:** `shopper@zentro.demo` / `admin@zentro.demo` — password `ShopDemo123!`

---

## Related documentation

| Topic | File |
|-------|------|
| Route map | [`../routes.md`](../routes.md) |
| Demo seed (full) | [`../seed.md`](../seed.md) |
| Production deploy | [`../production.md`](../production.md) |
| Regression checklist | [`../regression.md`](../regression.md) |
| Demo users (short) | [`../data.md`](../data.md) |
| API reference | [`../../../backend/myapp/docs/api-reference.md`](../../../backend/myapp/docs/api-reference.md) |
| Backend architecture | [`../../../backend/myapp/docs/backend-architecture.md`](../../../backend/myapp/docs/backend-architecture.md) |

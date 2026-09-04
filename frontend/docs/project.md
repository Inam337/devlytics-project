# Zentro — full project context

Single source of truth for what **Zentro** is, how the repo is organized, what is built, and where to look next. Prefer this file when onboarding or when an agent needs product/technical context before changing code.

**App package:** `frontend/myapp`  
**API package:** `backend/myapp`  
**Doc index:** [README.md](./README.md)

---

## 1. Product summary

**Zentro** is a commerce + inventory web app:

| Audience | Capabilities |
|----------|----------------|
| **Shopper** (`user`) | Browse catalog, manage cart, checkout, view orders, pay pending orders, change password |
| **Admin** (`admin`) | All shopper features + CRUD for categories, products, stock, suppliers, purchases, sales, customers, users |

Currency display uses **PKR**. Roles match backend `user.entity`: `user` | `admin`.

**Demo logins** (after `pnpm run seed:demo` in `backend/myapp`):

| Email | Password | Role |
|-------|----------|------|
| `shopper@zentro.demo` | `ShopDemo123!` | user |
| `admin@zentro.demo` | `ShopDemo123!` | admin |

---

## 2. Repository layout

```text
zentro-project/
├── frontend/
│   ├── docs/                 ← this documentation set
│   └── myapp/                ← React SPA (Vite)
├── backend/
│   └── myapp/                ← NestJS API + TypeORM + PostgreSQL
├── docker-compose.yml        ← local Postgres (db)
└── .github/workflows/ci.yml  ← frontend build + API regression
```

| Path | Role |
|------|------|
| `frontend/myapp/src` | UI, stores, services, models, styles |
| `frontend/docs` | Frontend architecture, phases, runbooks |
| `backend/myapp/src` | Nest modules, entities, auth, commerce APIs |
| `backend/myapp/docs` | API reference, backend architecture, seed tables |

---

## 3. Tech stack

### Frontend (`frontend/myapp`)

| Layer | Choice |
|-------|--------|
| Runtime | React 19, TypeScript ~5.8 |
| Bundler | Vite 7 |
| Styling | Tailwind CSS 4, CSS variables (Zentro palette) |
| Routing | react-router-dom 7 |
| Forms | react-hook-form + zod + `@hookform/resolvers` |
| State | Zustand (`stores/auth`, `stores/cart`) |
| HTTP | Axios (`libs/axios.ts`) + JWT attach / silent refresh |
| Tables | `@tanstack/react-table` via `DataTable` |
| Icons | `@fluentui/react-icons` (wrappers in `FluentIcons.tsx`); custom SVG icons under `components/icons` |
| i18n | `i18next` + `react-i18next` — locales `en.json`, `ur.json` |
| UI primitives | Radix (select, dialog, dropdown, …), vaul drawer, class-variance-authority, tailwind-merge |
| Toasts | `react-hot-toast` (`ToastNotifier` exists; wiring may still be partial) |

### Backend (`backend/myapp`)

| Layer | Choice |
|-------|--------|
| Framework | NestJS |
| ORM / DB | TypeORM + PostgreSQL |
| Auth | JWT access + refresh (`/auth/*`) |
| Docs | Scalar (`/reference`), Swagger (`/swagger`) |
| CORS | Nest `enableCors` (dev: Vite `:5173` / preview `:4173`) |

**API origin (dev):** `http://localhost:3000` — **no** global `/api/v1` prefix.  
**Frontend env:** `VITE_API_BASE_URL=http://localhost:3000` (read by `libs/axios.ts`).

---

## 4. Frontend architecture

```text
Pages / layouts
    → stores (auth, cart) and/or services
        → models + AppConstants.ApiUrls
            → libs/axios (apiClient)
                → NestJS :3000
```

| Layer | Location | Rules |
|-------|----------|--------|
| **HTTP** | `src/libs/axios.ts`, `auth-tokens.ts`, `refresh-token-request.ts` | Base URL, Bearer token, 401 → refresh |
| **Constants** | `src/common/AppConstants.ts` | Routes + relative API paths; no hard-coded URLs in pages |
| **Models** | `src/models/`, `models/enums/` | Types matching API JSON |
| **Services** | `src/services/*.ts` | One module per domain; thin `apiClient` wrappers |
| **Stores** | `src/stores/` | Session + cart; pages should not call axios directly |
| **Validation** | `src/validation-schemas/` | Zod schemas for auth/profile forms |
| **UI** | `src/components/ui/`, `layouts/`, `admin/`, `commerce/` | Shared primitives and page shells |
| **Pages** | `src/pages/accounts`, `commerce`, `admin` | Route screens only |

### Key source folders

```text
src/
├── assets/           # logos, login bg, icons barrel (index.ts)
├── common/           # AppConstants, MenuData, Roles
├── components/
│   ├── admin/        # FormDrawer hooks, filters, line-items, admin-form-styles
│   ├── auth/         # AuthRouteFallback
│   ├── commerce/     # ProductCard, StatusBadge, CommercePageState
│   ├── icons/        # FluentIcons + custom icons
│   ├── layouts/      # MainLayout, AppSidebar, AuthPageLayout, …
│   └── ui/           # Design system: Input, FormInput, FieldError, DataTable, …
├── hooks/            # use-t, useIsAdmin, useFilteredMenu, …
├── libs/             # axios, i18n, format-money, utils
├── locales/          # en.json, ur.json
├── models/
├── pages/
├── routes/           # AppRoutes, AdminRoutes, RootRedirect
├── services/
├── stores/
├── styles/           # index.css + theme CSS modules
└── validation-schemas/
```

---

## 5. Domains and API surface

Relative paths live in `AppConstants.ApiUrls` / `ApiUrlBuilders`. Services mirror these domains:

| Domain | Service(s) | Typical UI |
|--------|------------|------------|
| Auth | `auth.ts` | Login, register, forgot password, profile password |
| Users | `users.ts` | Admin users |
| Catalog | `products.ts`, `categories.ts` | Storefront + admin catalog |
| Customers / suppliers | `customers.ts`, `suppliers.ts` | Admin |
| Inventory | `stock.ts`, `purchases.ts`, `purchase-items.ts`, `sales.ts`, `sale-items.ts` | Admin |
| Cart | `cart.ts`, `cart-items.ts` | Cart, header badge |
| Orders / checkout | `orders.ts`, `order-items.ts` | Checkout, order list/detail |
| Payments | `payments.ts` | Pay pending order |

**Authoritative API docs:** `backend/myapp/docs/api-reference.md`  
**Interactive:** `http://localhost:3000/reference`

---

## 6. Routes and roles

Constants: `AppConstants.Routes`. Full map: [routes.md](./routes.md).

| Area | Paths | Access |
|------|-------|--------|
| Public | `/login`, `/register`, `/forgot-password` | No JWT; logged-in users → `/dashboard` |
| App | `/dashboard`, `/profile` | Any authenticated user |
| Storefront | `/products`, `/products/:id`, `/categories`, `/cart`, `/checkout`, `/orders`, `/orders/:id` | Any authenticated user |
| Admin | `/admin/categories`, `products`, `stock`, `suppliers`, `purchases`, `sales`, `customers`, `users` | `role === 'admin'` only (`AdminRoutes`) |

`/` and unknown public paths → `RootRedirect` (dashboard if authed, else login). Sidebar Admin group filtered by `useFilteredMenu`.

---

## 7. Branding and visual system

| Token | Hex | Use |
|-------|-----|-----|
| black-teal | `#1A312C` | Sidebar, dark text |
| teal | `#428475` | Primary actions, links |
| mint | `#89D7B7` | Accents, gradients |
| beige | `#FFF4E1` | Page background tint |

**Assets** (import from `@/assets`): `loginBg`, `logoColor`, `logoWhite`, `brandIcon`, `brandIconSvg`.

| Surface | Component |
|---------|-----------|
| Auth pages | `AuthPageLayout` + frosted `AuthFormLayout` |
| App chrome | `MainLayout` + `AppSidebar` (`BrandLogo variant="white"`) |
| Favicon / title | `public/favicon.*`, `index.html` → **Zentro** |

Details: [branding.md](./branding.md). Theme/UI migration plan: [ui-refactor-plan.md](./ui-refactor-plan.md).

### Form validation UI (current convention)

Shared styles: `components/ui/form-field-styles.ts` + CSS vars `--field-error-*` in `styles/index.css`.

| Element | Behavior |
|---------|----------|
| Invalid control | Red border (`aria-invalid` / `fieldInvalidClass`) |
| Field error | Left-aligned pink pill via `FieldError` (default `variant="field"`) |
| Form / API error | Centered pill (`variant="form"`) |
| Preferred inputs | `FormInput`, `PasswordInput`, `FormSelect`, `FormField` |

---

## 8. Implementation status

```text
Phases 0–7     ✅ Complete — HTTP, auth, API layer, commerce, admin, routes, production/CI
Demo seed      ✅ Complete — backend seed:demo + frontend verify:seed
Branding       ✅ Sprints A–C — favicon, sidebar, auth layout
i18n (US-8.10) ✅ Complete — en / ur
UI refactor    🟡 Theme + admin shells largely done; further polish optional
Phase 8 rest   ⬜ Optional — search, images, toasts wired globally, analytics, E2E, …
```

Phase-by-phase build notes: [phases/README.md](./phases/README.md).  
Master user stories: [architecture.md](./architecture.md).

---

## 9. Local development (quick)

```bash
# DB
docker compose up -d db

# API
cd backend/myapp
pnpm install
pnpm run seed:demo
pnpm run start:dev          # http://localhost:3000

# SPA
cd frontend/myapp
pnpm install
pnpm dev                    # http://localhost:5173
```

| Verify script (from `frontend/myapp`) | Needs |
|---------------------------------------|--------|
| `pnpm run verify:seed` | API up + seeded |
| `pnpm run verify:regression` | API up + seeded |
| `pnpm run verify:build` | Build + env check |
| `pnpm run verify:auth` | Auth phase checks |

Full setup: [dev-setup.md](./dev-setup.md). Seed tables & UI mapping: [seed.md](./seed.md). Production: [production.md](./production.md). QA: [regression.md](./regression.md).

---

## 10. Conventions for contributors / agents

1. **Do not hard-code API URLs** — use `AppConstants.ApiUrls` / `ApiUrlBuilders` and services.
2. **Pages call stores/services**, not `axios` / `apiClient` directly.
3. **Prefer existing UI primitives** (`FormInput`, `FieldError`, `PageShell`, `PageToolbar`, `FilterPanel`, `FormDrawer`, `DataTable`, `AppButton`) over one-off markup.
4. **Match Zentro palette and validation UI** — do not reintroduce generic purple themes or plain red text-only errors when shared components exist.
5. **i18n** — user-facing strings should go through `useT` / auth translation helpers and locale JSON where the screen already does.
6. **Admin vs shopper** — gate admin routes and menu with `admin` role; never expose admin CRUD to `user`.
7. **Docs** — update the relevant phase/runbook when behavior or routes change; keep this `project.md` status section honest.
8. **Commits / PRs** — only when the user asks; follow repo git/PR rules.

---

## 11. Documentation map

| Need | Doc |
|------|-----|
| **This overview** | [project.md](./project.md) |
| Doc index | [README.md](./README.md) |
| Phase context + verify | [phases/README.md](./phases/README.md) |
| Full integration stories | [architecture.md](./architecture.md) |
| URL / role map | [routes.md](./routes.md) |
| Local run | [dev-setup.md](./dev-setup.md) |
| Demo data | [seed.md](./seed.md), [data.md](./data.md) |
| Brand / assets | [branding.md](./branding.md) |
| UI migration | [ui-refactor-plan.md](./ui-refactor-plan.md) |
| Deploy | [production.md](./production.md) |
| QA checklist | [regression.md](./regression.md) |
| API contract | `backend/myapp/docs/api-reference.md` |
| Backend structure | `backend/myapp/docs/backend-architecture.md` |
| **Backend project context** | [`../../backend/docs/project.md`](../../backend/docs/project.md) |

---

## 12. Smoke checklist (happy path)

1. Login as shopper → dashboard → products → product detail → add to cart.
2. Cart → checkout → land on `/orders/:id`.
3. Pending order → pay (cod / other methods as exposed).
4. Logout → login as admin → open `/admin/categories` (and other admin CRUD).
5. Non-admin visiting `/admin/*` redirects to `/dashboard`.
6. Auth validation: empty submit shows red borders + pink error pills; API failure uses centered form error.

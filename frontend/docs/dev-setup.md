# Phase 0 — Local dev setup (complete)

Backend and frontend run locally; **cross-origin** uses **NestJS CORS (Option A)** — not a Vite proxy.

**All phases (context + verify):** [phases/README.md](./phases/README.md) · [docs/README.md](./README.md)

| Environment | Strategy |
|-------------|----------|
| **Development** | `app.enableCors()` in `backend/myapp/src/main.ts` allows `http://localhost:5173` (and preview `:4173`) |
| **Production** | Set `CORS_ORIGINS` on the API to your deployed SPA origin; set `VITE_API_BASE_URL` at frontend build time |

---

## 1. Backend (`backend/myapp`)

```bash
cd backend/myapp
pnpm install
# Optional: copy .env.example → .env and adjust DB_* / JWT_*

pnpm run start:dev
```

| Check | URL / command |
|-------|----------------|
| Health | [http://localhost:3000/](http://localhost:3000/) |
| Scalar API | [http://localhost:3000/reference](http://localhost:3000/reference) |
| Swagger | [http://localhost:3000/swagger](http://localhost:3000/swagger) |

**Mock data (optional):**

```bash
# From repo root — start DB first
docker compose up -d db

cd backend/myapp
pnpm run seed:demo        # skip if already seeded
# pnpm run seed:demo:fresh  # wipe + re-seed

pnpm run start:dev        # creates tables on first boot (or use seed alone — synchronize: true)
```

**Verify seed** (API running):

```bash
cd frontend/myapp
pnpm run verify:seed
```

See [seed.md](./seed.md) for full demo data, logins, and verification (`shopper@zentro.demo` / `ShopDemo123!`).

---

## 2. Frontend (`frontend/myapp`)

```bash
cd frontend/myapp
pnpm install
# .env.development should contain:
#   VITE_API_BASE_URL=http://localhost:3000

pnpm dev
```

| Check | URL |
|-------|-----|
| App | [http://localhost:5173](http://localhost:5173) |
| Login | [http://localhost:5173/login](http://localhost:5173/login) |
| Products (after login) | [http://localhost:5173/products](http://localhost:5173/products) |
| Cart | [http://localhost:5173/cart](http://localhost:5173/cart) |
| Orders | [http://localhost:5173/orders](http://localhost:5173/orders) |
| Admin (categories) | [http://localhost:5173/admin/categories](http://localhost:5173/admin/categories) *(admin only)* |
| Admin users | [http://localhost:5173/admin/users](http://localhost:5173/admin/users) *(admin only)* |
| Route map | [routes.md](./routes.md) |

---

## 3. Verify CORS (browser → API)

With the API running:

```bash
curl -s -o NUL -w "%{http_code}" -X OPTIONS http://localhost:3000/auth/login ^
  -H "Origin: http://localhost:5173" ^
  -H "Access-Control-Request-Method: POST"
```

Expect `204` or `200` and response headers including `Access-Control-Allow-Origin`.

Or in the browser DevTools → Network: after login work in Phase 2, requests to `localhost:3000` should not show CORS errors.

---

## 4. Environment variables

**Auth 500 fix:** `backend/myapp/.env` must include `JWT_REFRESH_SECRET` (not only `JWT_SECRET`). Restart the API after changing `.env`.

| App | File | Variable | Dev value |
|-----|------|----------|-----------|
| Frontend | `.env.development` | `VITE_API_BASE_URL` | *(empty — Vite dev proxy to :3000)* |
| Frontend | `.env.development` | `VITE_API_PROXY_TARGET` | `http://localhost:3000` |
| Frontend | `.env.development` | *(direct CORS alternative)* | `VITE_API_BASE_URL=http://localhost:3000` |
| Frontend | `.env.production` | `VITE_API_BASE_URL` | Your production API URL |
| Backend | `.env` (required for auth) | `JWT_SECRET`, `JWT_REFRESH_SECRET` | See `backend/myapp/.env.example` |
| Backend | `.env` (optional) | `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` |
| Backend | `.env` (optional) | `DB_*` | See `backend/myapp/.env.example` |

---

## Phase 0 checklist

- [x] PostgreSQL + API start (`pnpm run start:dev`)
- [x] `GET /` health check
- [x] Scalar at `/reference`
- [x] Frontend `pnpm dev` on port 5173
- [x] `VITE_API_BASE_URL` set for dev
- [x] CORS enabled on Nest for Vite origin
- [x] Production note: `CORS_ORIGINS` + build-time `VITE_API_BASE_URL`

**Phase 2 auth smoke test** (from `frontend/myapp`, backend must be running):

```bash
pnpm run verify:auth
```

---

## 5. Phase 4 — Commerce smoke test (UI)

Prerequisites: API running, `pnpm run seed:demo` completed, frontend `pnpm dev`.

**Demo shopper:** `shopper@zentro.demo` / `ShopDemo123!` — see [seed.md](./seed.md).

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open `/login`, sign in as shopper | Redirect to `/dashboard` |
| 2 | Sidebar → **Catalog → Products** or `/products` | Grid of seeded products; category chips filter list |
| 3 | Open a product (e.g. Wireless Earbuds) | Detail shows SKU, unit, price, stock hint |
| 4 | **Add to cart** | Header cart badge increases |
| 5 | `/cart` | Seeded lines (earbuds + mango juice) plus any new items; qty edit, remove, clear |
| 6 | **Checkout** → `/checkout` → **Place order** | New order created; redirect to `/orders/:id`; cart cleared server-side |
| 7 | `/orders` | Order history (seeded + new); status badges (`pending`, `confirmed`, `cancelled`) |
| 8 | Open unpaid order → select payment method → **Pay now** | Payment row created; status shown (errors on 403/404 are inline) |
| 9 | Log out | Cart badge resets; `/dashboard` redirects to login |

**API equivalents** (optional curl): `GET /cart`, `POST /orders/checkout`, `GET /orders`, `POST /payments` — examples in [backend data.md](../../backend/myapp/docs/data.md).

---

## Phase checklist (summary)

| Phase | Status | Verify |
|-------|--------|--------|
| 0 — Dev setup | ✅ | This doc |
| 1 — HTTP / env | ✅ | `VITE_API_BASE_URL` + proxy |
| 2 — Auth | ✅ | `pnpm run verify:auth` |
| 3 — Models + services | ✅ | `src/models/`, `src/services/` |
| 4 — Commerce UI | ✅ | Section 5 above |
| 5 — Admin CRUD | ✅ | Section 6 below |
| 6 — Routes + navigation | ✅ | Section 7 below |
| 7 — Production + regression | ✅ | Section 8 below |
| Seed — Demo data | ✅ | `pnpm run seed:demo` + `pnpm run verify:seed` |

---

## 6. Phase 5 — Admin smoke test (UI)

Prerequisites: API running, `pnpm run seed:demo` completed, frontend `pnpm dev`.

**Demo admin:** `admin@zentro.demo` / `ShopDemo123!` — see [seed.md](./seed.md).

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as admin | Sidebar shows **Admin** section (hidden for shopper) |
| 2 | `/admin/categories` | List seeded categories; add/edit/delete |
| 3 | `/admin/products` | List products; create with type + category; deactivate removes from shop |
| 4 | `/admin/stock` | Stock by product + location; create/edit/delete |
| 5 | `/admin/suppliers` | Metro Wholesale and CRUD |
| 6 | `/admin/purchases` | Seeded purchase lines; record new purchase with nested items + server total |
| 7 | `/admin/sales` | Seeded POS sale; record new sale with line items |
| 8 | `/admin/customers` | Hassan Traders + Sana Retail; add/edit/delete |
| 9 | `/admin/users` | Demo users listed; create user; toggle active; edit |
| 10 | Log in as `shopper@zentro.demo`, open `/admin/products` | Redirect to `/dashboard` (role guard) |

---

## 7. Phase 6 — Navigation smoke test (UI)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Visit `/` while logged out | Redirect to `/login` |
| 2 | Log in as shopper | Redirect to `/dashboard`; **no** Admin sidebar |
| 3 | Open `/products/1` (or any product id) | Product detail; sidebar **Products** stays active |
| 4 | Open `/orders/1` | Order detail; sidebar **Order list** stays active |
| 5 | Visit unknown path `/foo` while logged in | Redirect to `/dashboard` |
| 6 | Log in as admin | **Admin** menu with 8 items (through Users) |
| 7 | Deep link `/admin/users` | Users CRUD loads |
| 8 | Log out, visit `/` | Redirect to `/login` |

Full route table: **[routes.md](./routes.md)**.

---

## 8. Phase 7 — Production build & API regression

### Production build (local)

```bash
cd frontend/myapp

# Set your API origin for this build
# (or edit .env.production)
VITE_API_BASE_URL=https://api.staging.example.com pnpm run verify:build
```

Expect: Vite build succeeds and the API URL appears in `dist/assets/*.js`.

Preview the static build:

```bash
pnpm run preview
# → http://localhost:4173 (add to backend CORS_ORIGINS if using direct API URL)
```

Deploy **`dist/`** to your static host. See **[production.md](./production.md)**.

### API regression (automated)

Backend running + seed loaded:

```bash
cd backend/myapp
pnpm run seed:demo

cd ../../frontend/myapp
pnpm run verify:regression
```

Against staging:

```bash
API_BASE=https://api.staging.example.com pnpm run verify:regression
```

### Manual regression

Full UI checklist with sign-off template: **[regression.md](./regression.md)**.

### CI

Push to `main` / PRs run [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml):

- **frontend-build** — `verify:build` with `VITE_API_BASE_URL`
- **api-regression** — PostgreSQL → Nest API → seed → `verify:regression`

Next: **[architecture.md](./architecture.md)** Phase 8 (optional enhancements).

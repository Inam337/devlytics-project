# Zentro backend — full project context

Single source of truth for the **Zentro API**: what it does, how it is structured, conventions, domains, and where to dig deeper. Prefer this file when onboarding or when an agent needs backend context before changing code.

**API package:** `backend/myapp`  
**SPA package:** `frontend/myapp`  
**Deep docs (in package):** [`../myapp/docs/`](../myapp/docs/)  
**Frontend project context:** [`../../frontend/docs/project.md`](../../frontend/docs/project.md)

---

## 1. Product summary

**Zentro** is a commerce + inventory platform. This NestJS service is the HTTP API consumed by the React SPA.

| Audience | Backend support |
|----------|-----------------|
| **Shopper** (`Users.role = user`) | Auth, catalog reads, JWT-scoped cart → checkout → orders → payments, change password |
| **Admin** (`Users.role = admin`) | Same shopper APIs + catalog/inventory CRUD (categories, products, stock, suppliers, purchases, sales, customers, users). **RBAC on admin-only routes is primarily enforced in the SPA today**; many inventory CRUD endpoints are currently unauthenticated at the HTTP layer — harden before production. |

Currency amounts are stored as decimals/strings as defined per entity; the SPA displays **PKR**.

**Demo logins** (after `pnpm run seed:demo` from `backend/myapp`):

| Email | Password | Role |
|-------|----------|------|
| `shopper@zentro.demo` | `ShopDemo123!` | `user` |
| `admin@zentro.demo` | `ShopDemo123!` | `admin` |

---

## 2. Repository layout

```text
zentro-project/
├── backend/
│   ├── docs/                 ← this documentation set (project context)
│   └── myapp/                ← NestJS API
│       ├── src/              ← application code
│       ├── scripts/          ← seed-shop-demo.ts, …
│       ├── docs/             ← api-reference, architecture, data
│       └── .env.example
├── frontend/
│   ├── docs/                 ← SPA project context + phases
│   └── myapp/                ← React + Vite client
├── docker-compose.yml        ← local PostgreSQL
└── .github/workflows/ci.yml
```

| Path | Role |
|------|------|
| `backend/myapp/src` | Modules, entities, auth, HTTP |
| `backend/myapp/scripts` | Demo seed |
| `backend/myapp/docs` | API reference, architecture detail, seed tables |
| `backend/docs` | High-level backend project context (this file) |
| `frontend/docs` | SPA integration, routes, verification |

---

## 3. Tech stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js |
| Framework | NestJS 11 |
| Language | TypeScript ~5.7 |
| ORM / DB | TypeORM 0.3 + **PostgreSQL** (`pg`) |
| Config | `@nestjs/config` (global `ConfigModule`) |
| Validation | `class-validator` + `class-transformer` (global `ValidationPipe`) |
| Auth | JWT via `@nestjs/jwt` + `passport-jwt`; bcrypt passwords |
| API docs | Swagger UI (`/swagger`), OpenAPI JSON (`/api.json`), Scalar (`/reference`) |
| Package manager | pnpm (scripts in `package.json`) |

**Listen:** `process.env.PORT ?? 3000`  
**No global URL prefix** — routes are rooted at the origin (e.g. `POST /auth/login`, not `/api/v1/...`).  
**SPA env:** `VITE_API_BASE_URL=http://localhost:3000`

---

## 4. Architecture

```text
Controller (DTOs only)
    → Service (business rules, relation resolve, totals)
        → Repository (TypeORM wrappers)
            → PostgreSQL
```

Cross-cutting:

| Concern | Location |
|---------|----------|
| Bootstrap, CORS, ValidationPipe, OpenAPI | `src/main.ts` |
| Module wiring | `src/app.module.ts` |
| TypeORM options + entity list | `src/config/database.config.ts` |
| JWT strategy / guard | `src/auth/` |
| Current user id | `src/common/decorators/current-user-id.decorator.ts` |

### Feature modules under `src/`

```text
src/
  auth/
  cart/              # Cart + CartItem entities live here
  cart-item/         # line HTTP (PATCH/DELETE)
  category/
  common/decorators/
  config/
  customers/
  entities/          # shared domain entities + enums
  order/
  order-item/
  payment/
  product/
  purchase/
  purchase-item/
  sale/
  sale-item/
  stock/
  supplier/
  users/
```

Code uses `src/<feature>/` (not `src/modules/<feature>/`).

---

## 5. Global conventions

| Rule | Practice |
|------|----------|
| No entities in controllers | `@Body()` / queries use **DTOs** only |
| Validated input | Global pipe: `whitelist`, `forbidNonWhitelisted`, `transform: true` |
| Layering | Module → service → repository (`@InjectRepository` wrapped) |
| Relation inputs | DTOs take IDs (`categoryId`, `productId`, …); services load entities |
| Do not trust client prices | Cart/checkout use **DB product price**; order lines store a **price snapshot** |
| Soft-delete products | `Product.isActive`; `DELETE /products/:id` sets `isActive = false` |
| Server-side totals | Purchases/sales recompute `totalAmount` from line qty × unit price |
| User scoping | Cart, cart-items, orders, order-items, payments use JWT + `@CurrentUserId()` |
| Dev schema | `synchronize: true` — **disable in production** and use migrations |

---

## 6. Domains and HTTP surface

Full tables and examples: [`../myapp/docs/api-reference.md`](../myapp/docs/api-reference.md). Interactive: `http://localhost:3000/reference`.

### Auth (`/auth`)

| Method | Path | Auth |
|--------|------|------|
| POST | `/auth/register` | No |
| POST | `/auth/login` | No → `{ token, refreshToken, … }` |
| POST | `/auth/refresh-token` | No |
| POST | `/auth/change-password` | Bearer |

Login requires `Users.status === true`. Roles: `user` \| `admin` (`src/entities/user.entity.ts`).

### Catalog & inventory (mostly public HTTP today)

| Resource | Base path | Notes |
|----------|-----------|--------|
| Products | `/products` | List/get **active** only; soft delete |
| Categories | `/categories` | CRUD |
| Customers | `/customers` | CRUD |
| Suppliers | `/suppliers` | CRUD |
| Stock | `/stocks` | CRUD; resolves `productId` |
| Purchases (+ items) | `/purchases`, `/purchase-items` | Nested lines; server totals |
| Sales (+ items) | `/sales`, `/sale-items` | Nested lines; server totals |
| Users | `/users` | CRUD + `PATCH /users/:id/status` |

Product `type`: `goods` \| `service` \| `digital`.

### Commerce (JWT required)

Flow: **Cart → Order (checkout) → Payment**.

| Resource | Key routes |
|----------|------------|
| Cart | `GET /cart`, `POST /cart/items`, `DELETE /cart` |
| Cart items | `PATCH /cart-items/:id`, `DELETE /cart-items/:id` |
| Orders | `POST /orders/checkout`, `GET /orders`, `GET /orders/:id`, `PUT /orders/:id/status`, `DELETE /orders/:id` |
| Order items | `GET /order-items`, `GET /order-items/:id` |
| Payments | `POST /payments`, `GET /payments`, `GET /payments/:id`, `PUT /payments/:id/status`, `DELETE /payments/:id` |

- Checkout runs in a **transaction**: build order + snapshots from cart, then clear cart items.  
- Payment `amount` is always taken from `order.totalAmount` (never from the client).  
- Payment methods: `cod`, `stripe`, `jazzcash`, `easypaisa`.  
- Payment statuses: `pending`, `success`, `failed`. On `success`, order `isPaid = true`.  
- Order statuses: `pending`, `confirmed`, `cancelled`.

### Root

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health / hello |

---

## 7. Data model (entities)

Registered in `DatabaseConfigOptions.entities` (`src/config/database.config.ts`).

| Area | Entities / enums |
|------|------------------|
| Identity | `Users` (`role`, `status`) |
| Catalog | `Category`, `Product`, `ProductType`, `Stock` |
| Parties | `Customer`, `Supplier` |
| Inventory ops | `Purchase`, `PurchaseItem`, `Sale`, `SaleItem` |
| Commerce | `Cart`, `CartItem`, `Order`, `OrderItem`, `OrderStatus`, `Payment`, payment method/status enums |

Shared entity files often live under `src/entities/`; cart/order/payment entities may live under their feature folders — both are registered in the DB config.

---

## 8. Environment

Copy `backend/myapp/.env.example` → `.env` as needed.

| Variable | Purpose | Typical local |
|----------|---------|----------------|
| `PORT` | HTTP port | `3000` |
| `DB_HOST` / `DB_PORT` | Postgres | `localhost` / `5432` |
| `DB_USERNAME` / `DB_PASSWORD` | Credentials | `postgres` / `root` |
| `DB_NAME` | Database | `ShopDB` |
| `CORS_ORIGINS` | Comma-separated SPA origins | Vite `:5173` / `:5174` / preview `:4173` (defaults in `main.ts` if unset) |
| `JWT_SECRET` | Access token secret | required |
| `JWT_REFRESH_SECRET` | Refresh token secret | required |
| `JWT_EXPIRES_IN` | Access TTL | `1h` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh TTL | `7d` |

Never commit real `.env` secrets.

---

## 9. Local development

```bash
# From repo root — Postgres
docker compose up -d db

cd backend/myapp
pnpm install
# Optional: cp .env.example .env

pnpm run start:dev          # creates tables via synchronize
pnpm run seed:demo          # skip if categories already exist
# pnpm run seed:demo:fresh  # wipe demo commerce + re-seed
```

| Check | URL |
|-------|-----|
| Health | http://localhost:3000/ |
| Scalar | http://localhost:3000/reference |
| Swagger | http://localhost:3000/swagger |
| OpenAPI JSON | http://localhost:3000/api.json |

**Verify seed** (API must be running):

```bash
cd frontend/myapp
pnpm run verify:seed
# or from backend/myapp: pnpm run seed:verify
```

Seed details: [`../myapp/docs/data.md`](../myapp/docs/data.md) · Frontend mapping: [`../../frontend/docs/seed.md`](../../frontend/docs/seed.md).

### Scripts (`backend/myapp`)

| Command | Description |
|---------|-------------|
| `pnpm run start:dev` | Nest watch mode |
| `pnpm run build` | Compile to `dist/` |
| `pnpm run start:prod` | `node dist/main` |
| `pnpm run seed:demo` | Idempotent demo seed |
| `pnpm run seed:demo:fresh` | Wipe demo commerce + re-seed |
| `pnpm run lint` / `test` / `test:e2e` | Quality |

---

## 10. CORS and frontend integration

- **Dev:** Nest CORS allows Vite origins (see `DEFAULT_CORS_ORIGINS` in `main.ts`).  
- **Prod:** set `CORS_ORIGINS` to the deployed SPA origin(s); set `VITE_API_BASE_URL` at SPA **build** time to this API origin.  
- Frontend services call relative paths from `AppConstants.ApiUrls` against `VITE_API_BASE_URL`.  
- SPA project context: [`../../frontend/docs/project.md`](../../frontend/docs/project.md).

---

## 11. Implementation status & known gaps

```text
Auth (register/login/refresh/change-password)   ✅
Catalog / inventory CRUD modules                ✅
Cart → checkout → orders → payments             ✅
Demo seed + verify scripts                      ✅
OpenAPI (Swagger + Scalar)                      ✅
CORS for local Vite                             ✅
TypeORM synchronize (dev)                       ✅ (must turn off for prod)
HTTP-level admin RBAC on inventory CRUD         ⬜ Mostly open — SPA gates UI
Migrations instead of synchronize               ⬜ Recommended for production
API versioning prefix (/v1)                     ⬜ Optional
Payment webhooks / secrets                      ⬜ Status update is user-scoped today
```

---

## 12. Conventions for contributors / agents

1. **DTOs in controllers** — never accept/return raw entity types as request bodies.  
2. **Business logic in services** — repositories stay thin TypeORM helpers.  
3. **Resolve relations by ID** in the service; reject missing/inactive products where required.  
4. **Never take money totals or line prices from the client** for cart/checkout/payment create.  
5. **Register new entities** in `database.config.ts` and wire modules in `app.module.ts`.  
6. **Keep OpenAPI useful** — update DTO decorators when changing request/response shapes; refresh [`api-reference.md`](../myapp/docs/api-reference.md).  
7. **Seed changes** — update `scripts/seed-shop-demo.ts` and [`data.md`](../myapp/docs/data.md) together.  
8. **Production hardening** — migrations, strong JWT secrets, CORS lockdown, admin guards on mutating catalog/inventory routes.  
9. **Commits / PRs** — only when the user asks; follow repo git/PR rules.

---

## 13. Documentation map

| Need | Doc |
|------|-----|
| **This overview** | [project.md](./project.md) |
| Architecture detail | [`../myapp/docs/backend-architecture.md`](../myapp/docs/backend-architecture.md) |
| Endpoint catalogue | [`../myapp/docs/api-reference.md`](../myapp/docs/api-reference.md) |
| Demo seed tables | [`../myapp/docs/data.md`](../myapp/docs/data.md) |
| Package doc index | [`../myapp/docs/index.md`](../myapp/docs/index.md) |
| Package README | [`../myapp/README.md`](../myapp/README.md) |
| Frontend context | [`../../frontend/docs/project.md`](../../frontend/docs/project.md) |
| Frontend setup / smoke | [`../../frontend/docs/dev-setup.md`](../../frontend/docs/dev-setup.md) |
| Frontend routes | [`../../frontend/docs/routes.md`](../../frontend/docs/routes.md) |

---

## 14. Smoke checklist (API)

1. `GET /` returns hello.  
2. `POST /auth/login` with shopper demo → Bearer token.  
3. `GET /products` and `GET /categories` return seeded catalog.  
4. `POST /cart/items` → `GET /cart` shows lines.  
5. `POST /orders/checkout` → order with snapshotted prices; cart empty.  
6. `POST /payments` with `{ orderId, method: "cod" }` → amount matches order total.  
7. `PUT /payments/:id/status` with `success` → order `isPaid`.  
8. Admin demo login works; inventory CRUD responds (remember: HTTP may still be open without role guard).

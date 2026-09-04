# Demo database seed

End-to-end shop sample data for Zentro: catalog, cart, orders, payments, inventory, and admin screens populated on first paint.

**Phase context:** Used across Phases 4–7 — see [phases/README.md](./phases/README.md).

**Source script:** [`backend/myapp/scripts/seed-shop-demo.ts`](../../backend/myapp/scripts/seed-shop-demo.ts)  
**Backend reference (curl / API detail):** [`backend/myapp/docs/data.md`](../../backend/myapp/docs/data.md)

---

## Quick start

```bash
# 1. PostgreSQL (from repo root)
docker compose up -d db

# 2. Seed (from backend/myapp)
cd backend/myapp
pnpm run seed:demo
# pnpm run seed:demo:fresh   # wipe demo data + re-seed

# 3. API (separate terminal)
pnpm run start:dev

# 4. Verify (from frontend/myapp)
cd ../../frontend/myapp
pnpm run verify:seed
```

| Step | Command | Notes |
|------|---------|-------|
| Seed | `pnpm run seed:demo` | Skips if categories already exist |
| Reset | `pnpm run seed:demo:fresh` | Deletes demo commerce + demo users, re-inserts |
| Verify | `pnpm run verify:seed` | Requires API on `http://localhost:3000` |
| Backend alias | `pnpm run seed:verify` | Same verify script from `backend/myapp` |

**Aliases:** `seed`, `seed:fresh`, `mock:seed`, `mock:seed:fresh` (all in `backend/myapp`).

---

## Prerequisites

| Requirement | Default |
|-------------|---------|
| Database | PostgreSQL 16 (`docker compose up -d db`) |
| Host / port | `localhost:5432` |
| Database name | `ShopDB` |
| User / password | `postgres` / `root` |
| Tables | Created by TypeORM `synchronize: true` (seed script or API boot) |

Override with `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` in `backend/myapp/.env`.

### Idempotent vs fresh

| Mode | Behavior |
|------|----------|
| **Normal** (`seed:demo`) | Skips if any category rows exist; hints to use `--fresh` |
| **Fresh** (`seed:demo:fresh`) | Clears payments, orders, cart, sales, purchases, stock, products, categories, customers, suppliers, demo users; then seeds |

---

## Demo logins

**Password for both users:** `ShopDemo123!` (capital **S** and **D**, ends with **`!`**)

### Login not working?

1. **Backend running:** `cd backend/myapp && pnpm run start:dev` (port 3000)
2. **Frontend running:** `cd frontend/myapp && pnpm dev` (port 5173)
3. **Demo users exist:** `pnpm run seed:demo` or `pnpm run seed:demo:fresh` from `backend/myapp`
4. Click **Sign in** (the green button submits the form) — or press **Enter** in the password field
5. **Admin pages** require `admin@zentro.demo` — `shopper@zentro.demo` cannot open `/admin/*`

| Email | Name | Role | Use for |
|-------|------|------|---------|
| `shopper@zentro.demo` | Ayesha Khan | `user` | Storefront: cart (2 lines), orders (2), checkout, payments |
| `admin@zentro.demo` | Omar Admin | `admin` | `/admin/*` back-office screens |

```http
POST http://localhost:3000/auth/login
Content-Type: application/json

{ "email": "shopper@zentro.demo", "password": "ShopDemo123!" }
```

Response: `token`, `refreshToken`, `user`. Header for protected routes: `Authorization: Bearer <token>`.

---

## What gets inserted

| Domain | Contents |
|--------|----------|
| **Users** | Shopper + admin, both `status: true` |
| **Categories** | Grocery, Beverages, Electronics, Personal Care (4) |
| **Products** | 12 SKUs — goods, one service, one digital |
| **Stock** | Per-product qty + location; low stock on milk & soap |
| **Supplier** | Metro Wholesale Karachi |
| **Purchase** | Rice + oil inbound lines (total 151500 PKR) |
| **Sale** | POS earbuds sale (4999 PKR) |
| **Customers** | Hassan Traders, Sana Retail (B2B) |
| **Cart** (shopper) | 1× Wireless Earbuds Pro, 2× Mango Juice 1L |
| **Orders** (shopper) | #1 confirmed + paid (COD); #2 pending, unpaid |

---

## Categories

| Name | Description |
|------|-------------|
| Grocery | Staples, rice, pulses, and cooking essentials |
| Beverages | Juices, water, and soft drinks |
| Electronics | Accessories and small gadgets |
| Personal Care | Hygiene and grooming |

---

## Products (PKR)

| SKU | Name | Category | Type | Price | Unit |
|-----|------|----------|------|-------|------|
| GRC-RICE-5KG | Super Basmati Rice 5kg | Grocery | goods | 2499 | bag |
| GRC-DAL-1KG | Masoor Dal 1kg | Grocery | goods | 349 | pack |
| GRC-OIL-1L | Extra Virgin Olive Oil 1L | Grocery | goods | 1899 | bottle |
| GRC-MILK-1L | Fresh Milk 1L | Grocery | goods | 280 | carton |
| BEV-MANGO-1L | Mango Juice 1L | Beverages | goods | 450 | pack |
| BEV-WATER-6 | Mineral Water 6-Pack | Beverages | goods | 599 | pack |
| ELC-EARBUDS | Wireless Earbuds Pro | Electronics | goods | 4999 | piece |
| ELC-USBC-2M | USB-C Cable 2m | Electronics | goods | 899 | piece |
| PC-SHAMPOO-400 | Herbal Shampoo 400ml | Personal Care | goods | 750 | bottle |
| PC-SOAP-3 | Antibacterial Hand Soap 3-Pack | Personal Care | goods | 420 | pack |
| SVC-GIFT-WRAP | Gift Wrapping Service | Personal Care | service | 200 | service |
| DIG-GIFT-1K | E-Gift Card PKR 1000 | Electronics | digital | 1000 | card |

All products are `isActive: true`.

---

## Stock (highlights)

| SKU | Qty | Location | Note |
|-----|-----|----------|------|
| GRC-MILK-1L | 8 | Cold Store A | Low vs reorder 40 |
| PC-SOAP-3 | 5 | Aisle B | Low vs reorder 18 |
| GRC-RICE-5KG | 120 | Main Warehouse | Healthy |
| ELC-EARBUDS | 22 | Electronics Bay | Medium |

---

## Shopper cart

| Product | Qty |
|---------|-----|
| Wireless Earbuds Pro | 1 |
| Mango Juice 1L | 2 |

`GET /cart` with shopper JWT → 2 line items.

---

## Shopper orders

### Order 1 — confirmed, paid

| Line | Qty | Unit price |
|------|-----|------------|
| Super Basmati Rice 5kg | 2 | 2499 |
| Herbal Shampoo 400ml | 1 | 750 |

| Field | Value |
|-------|-------|
| Total | 5748.00 |
| Status | `confirmed` |
| isPaid | `true` |
| Payment | COD, `success`, `COD-DEMO-1001` |

### Order 2 — pending, unpaid

| Line | Qty | Unit price |
|------|-----|------------|
| Mineral Water 6-Pack | 1 | 599 |
| USB-C Cable 2m | 2 | 899 |

| Field | Value |
|-------|-------|
| Total | 2397.00 |
| Status | `pending` |
| isPaid | `false` |

---

## Supplier, purchase, sale, customers

**Supplier:** Metro Wholesale Karachi — `03001234567`, Industrial Area, Karachi

**Purchase:** 50× rice @ 2100 + 30× oil @ 1550 → **151500 PKR**

**Sale (POS):** 1× Wireless Earbuds Pro @ 4999

| Customer | Email | Phone |
|----------|-------|-------|
| Hassan Traders | hassan@traders.demo | 03009876543 |
| Sana Retail | sana@retail.demo | 03211234567 |

---

## Seed → frontend routes

### Storefront (`shopper@zentro.demo`)

| Seed data | Route | Check |
|-----------|-------|-------|
| 12 products, 4 categories | `/products`, `/categories` | Grid, filters, low-stock hints |
| Product by SKU | `/products/:id` | SKU, price, add to cart |
| Cart (earbuds + 2× juice) | `/cart` | Qty, remove, checkout CTA |
| Orders 1 & 2 | `/orders`, `/orders/:id` | Status badges, pay on pending |
| New checkout | `/checkout` | Place order → `/orders/:id` |

### Admin (`admin@zentro.demo`)

| Seed data | Route |
|-----------|-------|
| Categories | `/admin/categories` |
| Products | `/admin/products` |
| Stock | `/admin/stock` |
| Metro Wholesale | `/admin/suppliers` |
| Purchase | `/admin/purchases` |
| POS sale | `/admin/sales` |
| B2B customers | `/admin/customers` |
| Demo users | `/admin/users` |

Full route map: [routes.md](./routes.md).

---

## Verify seed (automated)

`frontend/myapp/scripts/verify-seed.mjs` checks:

- `GET /products` — ≥12 products, ≥4 categories
- `GET /stocks` — non-empty
- Shopper login → `GET /cart` — 2 lines
- Shopper login → `GET /orders` — ≥2 orders
- Admin login — `role: admin`

```bash
cd frontend/myapp
pnpm run verify:seed

# Staging API
API_BASE=https://api.staging.example.com pnpm run verify:seed
```

**Acceptance criteria (all pass when seeded + API up):**

- [x] `GET /products` returns multiple categories and realistic names/prices
- [x] Login as `shopper@zentro.demo` → cart has 2 lines; orders has ≥2 orders
- [x] `GET /stocks` returns varied quantities

---

## Quick API checks (curl)

```bash
curl http://localhost:3000/products

curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"shopper@zentro.demo\",\"password\":\"ShopDemo123!\"}"

# Replace TOKEN
curl http://localhost:3000/cart -H "Authorization: Bearer TOKEN"
curl http://localhost:3000/orders -H "Authorization: Bearer TOKEN"
```

Scalar: `http://localhost:3000/reference`

---

## UI walkthroughs

| Flow | Doc |
|------|-----|
| Commerce (login → pay) | [dev-setup.md § Phase 4](./dev-setup.md#5-phase-4--commerce-smoke-test-ui) |
| Admin CRUD | [dev-setup.md § Phase 5](./dev-setup.md#6-phase-5--admin-smoke-test-ui) |
| Navigation | [dev-setup.md § Phase 6](./dev-setup.md#7-phase-6--navigation-smoke-test-ui) |
| Full regression | [regression.md](./regression.md) |

---

## Related

| Document | Purpose |
|----------|---------|
| [dev-setup.md](./dev-setup.md) | Local run + phased smoke tests |
| [architecture.md](./architecture.md) | Integration phases; seed in implementation order |
| [data.md](./data.md) | Short frontend quick ref (links here) |
| [backend/myapp/docs/data.md](../../backend/myapp/docs/data.md) | Backend-authoritative tables + curl |
| [api-reference.md](../../backend/myapp/docs/api-reference.md) | All endpoints |

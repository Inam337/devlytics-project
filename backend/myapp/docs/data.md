# Mock users and demo data

Reference for the Zentro shop **demo seed**: mock accounts, catalog, inventory, and sample commerce records used for frontend development and API testing.

**Frontend seed guide:** [`../../../frontend/docs/seed.md`](../../../frontend/docs/seed.md) — quick start, verify, UI mapping.  
**Source script:** [`scripts/seed-shop-demo.ts`](../scripts/seed-shop-demo.ts)  
**SQL stub (users only):** [`scripts/seed-shop-demo.sql`](../scripts/seed-shop-demo.sql)

---

## Commands (run from `backend/myapp`)

All commands use the same TypeORM connection as the API (`src/config/database.config.ts`).

| Command | What it does |
|---------|----------------|
| `pnpm run seed:demo` | Insert demo data if **no categories** exist yet (safe first run) |
| `pnpm run seed:demo:fresh` | **Delete** commerce tables + demo users, then insert full dataset |
| `pnpm run seed` | Alias for `seed:demo` |
| `pnpm run seed:fresh` | Alias for `seed:demo:fresh` |
| `pnpm run mock:seed` | Alias for `seed:demo` |
| `pnpm run mock:seed:fresh` | Alias for `seed:demo:fresh` |

**npm** (same folder):

```bash
npm run seed:demo
npm run seed:demo:fresh
```

### Typical workflow

```bash
# 1. PostgreSQL running (default DB: ShopDB on localhost:5432)

# 2. Create tables (first time only)
pnpm run start:dev
# Wait for app to boot, then Ctrl+C — or leave it running

# 3. Load mock data
pnpm run seed:demo

# 4. Re-load after experiments (wipes demo commerce data)
pnpm run seed:demo:fresh

# 5. Verify (API running)
cd ../../frontend/myapp && pnpm run verify:seed
```

### Prerequisites

| Requirement | Default |
|-------------|---------|
| Database | PostgreSQL |
| Host / port | `localhost:5432` |
| Database name | `ShopDB` |
| User / password | `postgres` / `root` |
| Tables | Created by TypeORM `synchronize: true` when the API starts |

Override via environment variables: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`.

### Idempotent vs fresh

| Mode | Behavior |
|------|----------|
| **Normal** (`seed:demo`) | Skips if any category rows exist; prints hint to use `--fresh` |
| **Fresh** (`seed:demo:fresh`) | Clears payments, orders, cart, sales, purchases, stock, products, categories, customers, suppliers, and demo users; then seeds |

---

## Mock users (login)

**Password for every demo user:** `ShopDemo123!`

| Email | Name | Role | Status | Use for |
|-------|------|------|--------|---------|
| `shopper@zentro.demo` | Ayesha Khan | `user` | active (`true`) | Cart, checkout, orders, payments |
| `admin@zentro.demo` | Omar Admin | `admin` | active (`true`) | Admin UI / RBAC (future) |

**Login API**

```http
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "shopper@zentro.demo",
  "password": "ShopDemo123!"
}
```

Response includes `token` (access JWT) and `refreshToken`. Use header:

```http
Authorization: Bearer <token>
```

> Users must have `status: true` or login returns inactive error. The seeder sets both demo users active.

---

## Categories

| Name | Description |
|------|-------------|
| Grocery | Staples, rice, pulses, and cooking essentials |
| Beverages | Juices, water, and soft drinks |
| Electronics | Accessories and small gadgets |
| Personal Care | Hygiene and grooming |

---

## Products

Prices are in **PKR** (numeric, no currency symbol in API).

| SKU | Name | Category | Type | Price | Unit | Reorder |
|-----|------|----------|------|-------|------|---------|
| GRC-RICE-5KG | Super Basmati Rice 5kg | Grocery | goods | 2499 | bag | 15 |
| GRC-DAL-1KG | Masoor Dal 1kg | Grocery | goods | 349 | pack | 30 |
| GRC-OIL-1L | Extra Virgin Olive Oil 1L | Grocery | goods | 1899 | bottle | 10 |
| GRC-MILK-1L | Fresh Milk 1L | Grocery | goods | 280 | carton | 40 |
| BEV-MANGO-1L | Mango Juice 1L | Beverages | goods | 450 | pack | 20 |
| BEV-WATER-6 | Mineral Water 6-Pack | Beverages | goods | 599 | pack | 25 |
| ELC-EARBUDS | Wireless Earbuds Pro | Electronics | goods | 4999 | piece | 8 |
| ELC-USBC-2M | USB-C Cable 2m | Electronics | goods | 899 | piece | 50 |
| PC-SHAMPOO-400 | Herbal Shampoo 400ml | Personal Care | goods | 750 | bottle | 12 |
| PC-SOAP-3 | Antibacterial Hand Soap 3-Pack | Personal Care | goods | 420 | pack | 18 |
| SVC-GIFT-WRAP | Gift Wrapping Service | Personal Care | service | 200 | service | 0 |
| DIG-GIFT-1K | E-Gift Card PKR 1000 | Electronics | digital | 1000 | card | 0 |

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

## Supplier and purchase

**Supplier:** Metro Wholesale Karachi — `03001234567`, Industrial Area, Karachi

**Purchase lines**

| Product | Qty | Unit price | Line total |
|---------|-----|------------|------------|
| Super Basmati Rice 5kg | 50 | 2100 | 105000 |
| Extra Virgin Olive Oil 1L | 30 | 1550 | 46500 |

**Purchase total:** 151500

---

## Sale (POS sample)

| Product | Qty | Unit price | Total |
|---------|-----|------------|-------|
| Wireless Earbuds Pro | 1 | 4999 | 4999 |

---

## Customers (B2B records)

| Name | Email | Phone | Address |
|------|-------|-------|---------|
| Hassan Traders | hassan@traders.demo | 03009876543 | Saddar, Karachi |
| Sana Retail | sana@retail.demo | 03211234567 | Gulberg, Lahore |

---

## Shopper cart (`shopper@zentro.demo`)

| Product | Qty |
|---------|-----|
| Wireless Earbuds Pro | 1 |
| Mango Juice 1L | 2 |

**Try:** `GET /cart` with shopper JWT.

---

## Shopper orders

### Order 1 — confirmed, paid

| Line | Qty | Unit price |
|------|-----|------------|
| Super Basmati Rice 5kg | 2 | 2499 |
| Herbal Shampoo 400ml | 1 | 750 |

| Field | Value |
|-------|-------|
| **Total** | 5748.00 |
| **Status** | `confirmed` |
| **isPaid** | `true` |

**Payment**

| Field | Value |
|-------|-------|
| Method | `cod` |
| Status | `success` |
| Transaction ID | `COD-DEMO-1001` |
| Amount | 5748.00 |

### Order 2 — pending, unpaid

| Line | Qty | Unit price |
|------|-----|------------|
| Mineral Water 6-Pack | 1 | 599 |
| USB-C Cable 2m | 2 | 899 |

| Field | Value |
|-------|-------|
| **Total** | 2397.00 |
| **Status** | `pending` |
| **isPaid** | `false` |

---

## Quick API checks after seed

```bash
# Public catalog
curl http://localhost:3000/products

# Login (save token)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"shopper@zentro.demo\",\"password\":\"ShopDemo123!\"}"

# Cart (replace TOKEN)
curl http://localhost:3000/cart -H "Authorization: Bearer TOKEN"

# Orders
curl http://localhost:3000/orders -H "Authorization: Bearer TOKEN"
```

Interactive docs: `http://localhost:3000/reference`

---

## Frontend mapping (Phase 4 UI)

With `frontend/myapp` on `http://localhost:5173` and seed loaded, log in as **shopper@zentro.demo** and use:

| API / seed entity | App route | Notes |
|-------------------|-----------|-------|
| `GET /products` | `/products` | All 12 active products; category chips |
| `GET /products/:id` | `/products/:id` | e.g. earbuds `ELC-EARBUDS`, mango `BEV-MANGO-1L` |
| `GET /categories` | `/categories` | Grocery, Beverages, Electronics, Personal Care |
| `GET /cart` | `/cart` | Pre-filled earbuds + 2× mango juice |
| `POST /orders/checkout` | `/checkout` → **Place order** | Clears cart; navigates to `/orders/:id` |
| `GET /orders` | `/orders` | Order 1 (paid), Order 2 (pending) + new orders |
| `GET /orders/:id` | `/orders/:id` | Line items, totals, payment block |
| `POST /payments` | `/orders/:id` → **Pay now** | Methods: `cod`, `stripe`, `jazzcash`, `easypaisa` |

**Admin seed user** (`admin@zentro.demo`) — same password; use `/admin/*` routes in the SPA (categories, products, stock, suppliers, purchases, sales).

| Seed entity | Admin UI route |
|-------------|----------------|
| Categories | `/admin/categories` |
| Products | `/admin/products` |
| Stock | `/admin/stock` |
| Metro Wholesale | `/admin/suppliers` |
| Purchase 151500 | `/admin/purchases` |
| POS sale 4999 | `/admin/sales` |
| Hassan Traders, Sana Retail | `/admin/customers` |
| `shopper@` / `admin@` demo users | `/admin/users` |

**Docs:** [seed.md](../../../frontend/docs/seed.md) · [routes map](../../../frontend/docs/routes.md) · [dev-setup smoke tests](../../../frontend/docs/dev-setup.md) · [architecture](../../../frontend/docs/architecture.md)

---

## Related docs

| Doc | Path |
|-----|------|
| API endpoints | [`api-reference.md`](./api-reference.md) |
| Backend architecture | [`backend-architecture.md`](./backend-architecture.md) |
| Frontend integration plan | [`../../../frontend/docs/architecture.md`](../../../frontend/docs/architecture.md) |
| Frontend seed guide | [`../../../frontend/docs/seed.md`](../../../frontend/docs/seed.md) |
| Frontend data quick ref | [`../../../frontend/docs/data.md`](../../../frontend/docs/data.md) |

# Mock users and demo data (quick ref)

Use backend demo seed so catalog, cart, checkout, and admin screens are populated on day one.

**Full seed guide:** [`seed.md`](./seed.md) — commands, tables, routes, verify script.  
**Backend detail:** [`backend/myapp/docs/data.md`](../../backend/myapp/docs/data.md)

---

## Commands

Run from **`backend/myapp`** (not `frontend/myapp`):

| Command | Description |
|---------|-------------|
| `pnpm run seed:demo` | Load mock data (skips if already seeded) |
| `pnpm run seed:demo:fresh` | Wipe demo commerce data and re-seed |
| `pnpm run seed` | Same as `seed:demo` |
| `pnpm run seed:fresh` | Same as `seed:demo:fresh` |
| `pnpm run mock:seed` | Same as `seed:demo` |
| `pnpm run mock:seed:fresh` | Same as `seed:demo:fresh` |

```bash
# From repo root
docker compose up -d db

cd backend/myapp
pnpm run seed:demo    # creates tables (synchronize) + mock data; skips if categories exist
# pnpm run seed:demo:fresh   # wipe demo commerce data and re-seed

pnpm run start:dev    # API for UI / verify scripts
```

**Verify** (API must be running):

```bash
cd frontend/myapp
pnpm run verify:seed
```

---

## Mock logins (for UI / Scalar)

| Email | Password | Role |
|-------|----------|------|
| `shopper@zentro.demo` | `ShopDemo123!` | user — cart + 2 orders; no Admin menu |
| `admin@zentro.demo` | `ShopDemo123!` | admin — `/admin/*` back-office |

> Registering an email that already exists returns **409**. Use a new email or log in instead.

**API base (dev):** leave `VITE_API_BASE_URL` empty in `.env.development` (Vite proxy → `http://localhost:3000`), or set `VITE_API_BASE_URL=http://localhost:3000` for direct CORS.  
**Login:** `POST /auth/login` → use `token` in `Authorization: Bearer …`

---

## Seed data → frontend screens (Phase 4)

After login as **shopper**, map seeded records to app routes:

| Seeded data | Frontend route | What to check |
|-------------|----------------|---------------|
| 12 products, 4 categories | `/products`, `/categories` | Grid, category filter (`?categoryId=`), low-stock hints (milk, soap) |
| Any product by SKU | `/products/:id` | Description, SKU, unit, PKR price, add to cart |
| Cart: earbuds ×1, mango juice ×2 | `/cart` | Line totals, qty update, remove, clear |
| Order 1 (confirmed, paid) | `/orders` → `/orders/:id` | Status `confirmed`, paid badge, COD payment |
| Order 2 (pending, unpaid) | `/orders` → `/orders/:id` | Pay now — method dropdown (cod, stripe, jazzcash, easypaisa) |
| New checkout | `/checkout` | Place order from cart → lands on new `/orders/:id` |

**Header:** cart badge (`HeaderCartLink`) reflects item count from `GET /cart`.

---

## Phase 4 UI walkthrough

1. `http://localhost:5173/login` — `shopper@zentro.demo` / `ShopDemo123!`
2. **Dashboard** (`/dashboard`) — quick links to products, cart, orders
3. **Products** — filter **Beverages** → Mango Juice; open **Electronics** → Wireless Earbuds Pro
4. **Cart** — confirm seeded lines; change quantity or add another product from catalog
5. **Checkout** — review lines → **Place order** → order detail page
6. **Orders** — two seeded orders + any new; open pending order → create payment
7. **Logout** — cart store cleared; private URLs redirect to login

Detailed steps: [dev-setup.md § Phase 4](./dev-setup.md#5-phase-4--commerce-smoke-test-ui).

---

## Seed data → admin screens (Phase 5)

Log in as **`admin@zentro.demo`**:

| Seeded data | Admin route | What to check |
|-------------|-------------|---------------|
| 4 categories | `/admin/categories` | CRUD; product count per category |
| 12 products | `/admin/products` | CRUD; type enum; category selector; deactivate |
| Stock rows (milk low, etc.) | `/admin/stock` | productId + location + quantity |
| Metro Wholesale supplier | `/admin/suppliers` | CRUD |
| Purchase (rice + oil) | `/admin/purchases` | nested items; server `totalAmount` |
| POS earbuds sale | `/admin/sales` | nested items; server total |
| Hassan Traders, Sana Retail | `/admin/customers` | B2B customer CRUD |
| Demo users | `/admin/users` | App user list; create; activate/deactivate |

Walkthrough: [dev-setup.md § Phase 5](./dev-setup.md#6-phase-5--admin-smoke-test-ui) · [Phase 6 navigation](./dev-setup.md#7-phase-6--navigation-smoke-test-ui) · [routes.md](./routes.md).

---

## What you get for UI

- **12 products** across 4 categories (goods, service, digital)
- **Stock** with low-inventory items (milk, soap) for badges
- **Active cart** for shopper (earbuds + mango juice)
- **Order history** — one paid/confirmed, one pending
- **Customers, supplier, purchase, sale** for admin/inventory pages (Phase 5)

See the [backend data doc](../../backend/myapp/docs/data.md) for SKU tables, order line details, and `curl` examples.

---

## Related

- [Demo seed guide](./seed.md)
- [Phase 0 dev setup](./dev-setup.md)
- [Frontend integration plan](./architecture.md)
- [Route map](./routes.md)
- [Production deploy](./production.md)
- [Regression checklist](./regression.md)
- [Backend API reference](../../backend/myapp/docs/api-reference.md)

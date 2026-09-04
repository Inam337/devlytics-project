# Phase 4 — Commerce flows (customer-facing)

**Status:** ✅ Complete  
**Goal:** Full shopper journey — catalog → cart → checkout → orders → payments.

---

## Context

Commerce screens use `MainLayout` (sidebar + header with cart badge and profile). Styling follows the auth card pattern. Cart state is server-authoritative: prices come from the API, not the client. Seed data (`shopper@zentro.demo`) preloads cart lines and orders for demo.

---

## Routes

| Screen | URL | Component |
|--------|-----|-----------|
| Shop home | `/dashboard` | `pages/Dashboard.tsx` |
| Product catalog | `/products` | `pages/commerce/ProductsPage.tsx` |
| Product detail | `/products/:id` | `pages/commerce/ProductDetailPage.tsx` |
| Categories | `/categories` | `pages/commerce/CategoriesPage.tsx` |
| Cart | `/cart` | `pages/commerce/CartPage.tsx` |
| Checkout | `/checkout` | `pages/commerce/CheckoutPage.tsx` |
| Order history | `/orders` | `pages/commerce/OrdersPage.tsx` |
| Order + payment | `/orders/:id` | `pages/commerce/OrderDetailPage.tsx` |

Full map: [routes.md](../routes.md).

---

## User stories

### US-4.1 — Product catalog

- [x] `GET /products`, `GET /products/:id`, `GET /categories`
- [x] Category filter chips on products page
- [x] Active products only (backend filters `isActive`)
- [x] Detail: description, SKU, unit, price, stock hints

**Components:** `ProductCard`, `libs/format-money.ts`, `libs/product-stock.ts`

### US-4.2 — Shopping cart

- [x] Zustand `stores/cart.ts`; sync on add/update/remove/clear
- [x] `HeaderCartLink` badge; `CartPage` quantities
- [x] `addToCart({ productId, quantity })` — no client price
- [x] Cart scoped to JWT user; cleared on logout

### US-4.3 — Checkout and orders

- [x] `POST /orders/checkout` from `CheckoutPage`
- [x] `OrdersPage` with `StatusBadge`; `OrderDetailPage` line items
- [x] Successful checkout clears server cart

### US-4.4 — Payments

- [x] Methods: `cod`, `stripe`, `jazzcash`, `easypaisa`
- [x] `OrderDetailPage`: create payment, show status
- [x] 403/404 handled gracefully

---

## Key files

```
src/pages/commerce/
src/components/commerce/     # ProductCard, CommercePageState, StatusBadge
src/stores/cart.ts
src/services/{products,categories,cart,cart-items,orders,payments}.ts
src/components/layouts/HeaderCartLink.tsx
src/common/MenuData.ts       # catalog + orders menu
src/locales/en.json          # commerce.*
```

---

## Happy path (manual)

1. `pnpm run seed:demo` — see [seed.md](../seed.md)
2. Login as `shopper@zentro.demo` / `ShopDemo123!`
3. `/products` → add item → `/cart` → `/checkout` → place order
4. `/orders/:id` → pay (e.g. COD)

---

## Verify

```bash
pnpm run verify:regression   # API: list → cart → checkout → pay
pnpm run verify:seed         # seeded cart + orders for shopper
```

---

## Next phase

→ [05-admin.md](./05-admin.md)

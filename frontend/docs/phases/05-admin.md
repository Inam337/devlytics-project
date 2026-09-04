# Phase 5 — Admin / inventory (back-office)

**Status:** ✅ Complete  
**Goal:** CRUD for catalog, inventory, purchases, sales, customers, and users — admin role only.

---

## Context

Admin pages live under `/admin/*` with `AdminRoutes` role guard. Non-admin users are redirected to `/dashboard`. Sidebar **Admin** section is hidden via `useFilteredMenu` unless `user.role === 'admin'`. Product delete is a **soft deactivate** (hidden from shop catalog).

Login: `admin@zentro.demo` / `ShopDemo123!`

---

## Routes

| Screen | URL | Page |
|--------|-----|------|
| Categories | `/admin/categories` | `AdminCategoriesPage` |
| Products | `/admin/products` | `AdminProductsPage` |
| Stock | `/admin/stock` | `AdminStockPage` |
| Suppliers | `/admin/suppliers` | `AdminSuppliersPage` |
| Purchases | `/admin/purchases` | `AdminPurchasesPage` |
| Sales (POS) | `/admin/sales` | `AdminSalesPage` |
| Customers | `/admin/customers` | `AdminCustomersPage` |
| Users | `/admin/users` | `AdminUsersPage` |

---

## User stories

### US-5.1 — Categories CRUD

- [x] Full CRUD via `/categories`
- [x] Forms: `{ name, description }`

### US-5.2 — Products CRUD

- [x] Create/edit with `type`: `goods`, `service`, `digital`
- [x] `categoryId` selector; soft delete (deactivate)

### US-5.3 — Suppliers, stock, purchases

- [x] Suppliers CRUD
- [x] Stock per `productId` + `location`
- [x] Purchases with nested `items[]`; totals server-side

### US-5.4 — Sales (POS)

- [x] Sales with nested line items; total server-side

### US-5.5 — Customers and users

- [x] B2B customer CRUD (name, email, phone, address)
- [x] User CRUD (activate/deactivate, optional password on create)
- [x] Behind `roles: ['admin']` guard

---

## Key files

```
src/pages/admin/
src/components/admin/InventoryLineItemsForm.tsx
src/routes/AdminRoutes.tsx
src/hooks/useIsAdmin.ts
src/hooks/useFilteredMenu.ts
src/common/Roles.ts
src/services/{categories,products,suppliers,stock,purchases,sales,customers,users}.ts
src/locales/en.json          # admin.*, menu.admin*
```

---

## Shared patterns

- Inline create/edit forms on list pages
- `CommercePageState` for empty/loading/error
- `window.confirm` before delete/deactivate
- Line items: `InventoryLineItemsForm` for purchases and sales

---

## Verify

1. Login as `admin@zentro.demo`
2. Sidebar shows **Admin** section
3. Create category → product → stock entry
4. Log in as `shopper@zentro.demo` — `/admin/*` redirects to dashboard

```bash
pnpm run verify:regression   # includes admin category → product → stock
```

---

## Next phase

→ [06-routing.md](./06-routing.md)

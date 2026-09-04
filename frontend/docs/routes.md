# Frontend routes and navigation

Quick reference for **`frontend/myapp`** URLs, layout, and role visibility. Constants live in `src/common/AppConstants.ts`; sidebar in `src/common/MenuData.ts`.

---

## Public (no JWT)

| Route | Page | Notes |
|-------|------|-------|
| `/login` | `LoginPage` | Authenticated users redirect to `/dashboard` |
| `/register` | `RegisterPage` | Same redirect when logged in |
| `/forgot-password` | `ForgotPasswordPage` | Same redirect when logged in |

---

## Private (JWT required)

All routes below use `PrivateRoutes` → `MainLayout` (sidebar + header).

### General

| Route | Page | Roles |
|-------|------|-------|
| `/dashboard` | `Dashboard` | all |
| `/profile` | `Profile` | all |

### Storefront (Phase 4)

| Route | Page | Roles |
|-------|------|-------|
| `/products` | `ProductsPage` | all |
| `/products/:id` | `ProductDetailPage` | all |
| `/categories` | `CategoriesPage` | all |
| `/cart` | `CartPage` | all |
| `/checkout` | `CheckoutPage` | all |
| `/orders` | `OrdersPage` | all |
| `/orders/:id` | `OrderDetailPage` | all |

### Admin (Phase 5–6)

Guard: `AdminRoutes` — non-`admin` role → redirect `/dashboard`.  
Menu: **Admin** group hidden unless `user.role === 'admin'` (`useFilteredMenu`).

| Route | Page |
|-------|------|
| `/admin/categories` | `AdminCategoriesPage` |
| `/admin/products` | `AdminProductsPage` |
| `/admin/stock` | `AdminStockPage` |
| `/admin/suppliers` | `AdminSuppliersPage` |
| `/admin/purchases` | `AdminPurchasesPage` |
| `/admin/sales` | `AdminSalesPage` |
| `/admin/customers` | `AdminCustomersPage` |
| `/admin/users` | `AdminUsersPage` |

---

## Redirects

| Path | Behavior |
|------|----------|
| `/` | `RootRedirect` → `/dashboard` if authenticated, else `/login` |
| Unknown path (outside private tree) | Same as `/` |
| Unknown path (inside private tree) | `/dashboard` |
| `/admin/*` as non-admin | `/dashboard` |
| Public auth pages while logged in | `/dashboard` |

---

## Roles

Defined in `src/common/Roles.ts` (matches backend `user.entity`):

| Value | Meaning | UI |
|-------|---------|-----|
| `user` | Default shopper | Catalog, cart, orders; no Admin menu |
| `admin` | Back-office | All storefront + Admin section |

Demo accounts: [seed.md](./seed.md).

---

## Sidebar active state

`NestingNav` highlights a item when the path equals the URL or starts with `URL/` (e.g. `/orders/3` keeps **Order list** active).

---

## Related

- [architecture.md](./architecture.md) — integration phases
- [dev-setup.md](./dev-setup.md) — smoke tests
- [seed.md](./seed.md) — demo seed guide

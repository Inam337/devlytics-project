# Phase 6 — Routing, layout, and navigation

**Status:** ✅ Complete  
**Goal:** Clear URLs, sidebar navigation, role-based menus, deep links for product/order detail.

---

## Context

All private routes nest under `PrivateRoutes` → `MainLayout` → `AppSidebar` + header. `RootRedirect` sends `/` to dashboard (if authenticated) or login. `NestingNav` highlights parent menu items when on detail routes (`/products/:id`, `/orders/:id`).

---

## User stories

### US-6.1 — Expand AppRoutes

- [x] `AppConstants.Routes.Private.*` + `RouteBuilders.product` / `RouteBuilders.order`
- [x] Commerce routes in `routes/AppRoutes.tsx`
- [x] Admin under `/admin/*` with `AdminRoutes`
- [x] `MenuData.ts`: catalog, orders, admin submenu
- [x] `HeaderCartLink` in layout header
- [x] `RootRedirect` for `/` and global `*`
- [x] Private unknown path → `/dashboard`
- [x] Full table in [routes.md](../routes.md)

### US-6.2 — Role-based UI

- [x] `common/Roles.ts`: `user`, `admin`
- [x] `useFilteredMenu` filters by `MenuItem.roles`
- [x] `useIsAdmin` + `AdminRoutes` gate admin URLs
- [x] Role strings match backend `user.role`

---

## Key files

| File | Role |
|------|------|
| `src/routes/AppRoutes.tsx` | Top-level route tree |
| `src/routes/AdminRoutes.tsx` | Admin role guard |
| `src/routes/RootRedirect.tsx` | `/` and catch-all |
| `src/routes/PrivateRoutes.tsx` | Auth guard |
| `src/common/AppConstants.ts` | Route path constants |
| `src/common/MenuData.ts` | Sidebar structure |
| `src/components/layouts/MainLayout.tsx` | Shell + page titles |
| `src/components/layouts/AppSidebar.tsx` | Sidebar UI + `BrandLogo` (white wordmark) |
| `src/components/layouts/AuthPageLayout.tsx` | Public auth shell (`login-bg`, color logo) |
| `src/components/ui/BrandLogo.tsx` | Logo variants for sidebar and auth |
| `src/components/ui/NestingNav.tsx` | Active state for nested routes |
| `src/hooks/useFilteredMenu.ts` | Role-filtered menu |

**Branding details:** [branding.md](../branding.md)

---

## Layout behavior

- Page title from route key or `headerTitle` prop (`MainLayout`)
- Cart fetched on layout mount (`useCartStore.fetchCart`)
- Header: language switcher, cart link, profile dropdown

---

## Verify

| Action | Expected |
|--------|----------|
| Visit `/products/1` logged in | Product detail; sidebar **Products** active |
| Visit `/admin/products` as shopper | Redirect `/dashboard` |
| Visit `/` logged out | Redirect `/login` |
| Visit `/unknown` logged in | Redirect `/dashboard` |

---

## Next phase

→ [07-production.md](./07-production.md)

# Regression checklist

Repeatable QA for Zentro frontend ↔ Nest API integration. Run before releases or after large changes.

**Automated API regression** (backend must be running, seed loaded):

```bash
cd backend/myapp && pnpm run seed:demo
cd ../../frontend/myapp && pnpm run verify:regression
# Staging: API_BASE=https://api.staging.example.com pnpm run verify:regression
```

**Auth-only smoke:** `pnpm run verify:auth`

**Seed data smoke** (after `pnpm run seed:demo`): `pnpm run verify:seed`

---

## 1. Authentication

| # | Step | Expected | Auto |
|---|------|----------|------|
| 1.1 | Login `shopper@zentro.demo` / `ShopDemo123!` | Redirect `/dashboard` | ✓ |
| 1.2 | Invalid password | Inline error, stay on login | ✓ |
| 1.3 | Register new email | Auto sign-in → dashboard | partial |
| 1.4 | Refresh token (wait or force 401) | Session renews or logout | ✓ refresh |
| 1.5 | Logout | Cart badge clears; `/dashboard` → login | manual |
| 1.6 | Profile → change password | Success message | manual |
| 1.7 | Auth pages branding | `login-bg` + color logo + frosted card | manual |
| 1.8 | Browser tab | Favicon (circular Z), title **Zentro** | manual |

---

## 2. Storefront (shopper)

| # | Step | Expected | Auto |
|---|------|----------|------|
| 2.1 | `/products` | Grid, category filters | ✓ list |
| 2.2 | `/products/:id` | SKU, price, add to cart | manual |
| 2.3 | Header cart badge | Updates on add | manual |
| 2.4 | `/cart` | Lines, qty, remove, clear | ✓ cart |
| 2.5 | `/checkout` → place order | Order detail; cart cleared | ✓ |
| 2.6 | `/orders` | History + status badges | manual |
| 2.7 | Unpaid order → Pay COD | Payment row created | ✓ |

---

## 3. Admin (`admin@zentro.demo`)

| # | Step | Expected | Auto |
|---|------|----------|------|
| 3.1 | Sidebar **Admin** visible + white logo | Wordmark expanded; icon when collapsed | manual |
| 3.2 | Create category | Appears in list | ✓ |
| 3.3 | Create product (type + category) | In catalog | ✓ |
| 3.4 | Create stock (product + location) | Listed | ✓ |
| 3.5 | Record purchase (supplier + lines) | Server total | manual |
| 3.6 | Record sale (POS lines) | Server total | manual |
| 3.7 | Customers / users CRUD | B2B + app users | manual |
| 3.8 | Shopper opens `/admin/*` | Redirect `/dashboard` | manual |

---

## 4. Errors & edge cases

| # | Step | Expected | Auto |
|---|------|----------|------|
| 4.1 | POST invalid category `{}` | 400 validation | ✓ |
| 4.2 | POST invalid product body | 400 validation | ✓ |
| 4.3 | `GET /cart` without JWT | 401 | ✓ |
| 4.4 | Network offline / 5xx | Inline error + retry UI | manual |

---

## 5. Navigation

| # | Step | Expected |
|---|------|----------|
| 5.1 | `/` logged out | → `/login` |
| 5.2 | `/` logged in | → `/dashboard` |
| 5.3 | `/products/1` | Products menu active |
| 5.4 | Unknown `/foo` (logged in) | → `/dashboard` |

See [routes.md](./routes.md).

---

## 6. Production build

| # | Step | Expected | Auto |
|---|------|----------|------|
| 6.1 | `VITE_API_BASE_URL=… pnpm run verify:build` | `dist/` + URL in bundle | ✓ |
| 6.2 | `pnpm run preview` + login | API calls hit configured origin | manual |

See [production.md](./production.md).

---

## Sign-off template

```
Date: ___________
Tester: ___________
API: local / staging / production
Frontend: commit ___________

[ ] §1 Auth (incl. branding 1.7–1.8)
[ ] §2 Storefront
[ ] §3 Admin (incl. sidebar logo 3.1)
[ ] §4 Errors
[ ] §5 Navigation
[ ] §6 Production build
[ ] pnpm run verify:regression — exit 0

Notes:
```

---

## Related

- [dev-setup.md](./dev-setup.md) — phased smoke tests
- [branding.md](./branding.md) — favicon, auth layout, sidebar logo
- [production.md](./production.md) — deploy + CI
- [seed.md](./seed.md) — demo seed guide
- [data.md](./data.md) — demo accounts quick ref

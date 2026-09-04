# Phase 8 — Nice-to-have enhancements (optional)

**Status:** 🟡 Partial — **US-8.10 (i18n)** complete; remainder open  
**Goal:** Polish and scale features after Phases 0–7. None block MVP.

Implement when core flows are stable. See [architecture.md](../architecture.md) for full user-story wording.

---

## Progress overview

| US | Feature | Status |
|----|---------|--------|
| 8.1 | Product search and filters | ⬜ Not started |
| 8.2 | Product images and rich cards | ⬜ Not started |
| 8.3 | Wishlist / save for later | ⬜ Not started |
| 8.4 | Order tracking timeline | ⬜ Not started |
| 8.5 | Notifications (toast) | ⬜ Not started |
| 8.6 | Dark mode | ⬜ Not started |
| 8.7 | Pagination / virtualization | ⬜ Not started |
| 8.8 | Admin dashboard analytics | ⬜ Not started |
| 8.9 | Export CSV / PDF | ⬜ Not started |
| **8.10** | **Multi-language (i18n)** | **✅ Complete** |
| 8.11 | PWA / offline shell | ⬜ Not started |
| 8.12 | OpenAPI client codegen | ⬜ Not started |
| 8.13 | TanStack Query | ⬜ Not started |
| 8.14 | E2E tests (Playwright) | ⬜ Not started |
| 8.15 | Request ID / observability | ⬜ Not started |

---

## US-8.10 — Multi-language (i18n) ✅

**Decision:** Replaced **`react-intl`** with **`i18next` + `react-i18next`** — simpler API, nested JSON without flattening.

### What was built

| Item | Detail |
|------|--------|
| Packages | `i18next`, `react-i18next` (removed `react-intl`) |
| Init | `src/libs/i18n.ts` — EN + UR resources, `localStorage` key `zentro-locale` |
| Locales | `src/locales/en.json`, `src/locales/ur.json` |
| Hook | `src/hooks/use-t.ts` — `t(id, defaultMessage?, values?)` |
| Auth | `src/hooks/use-auth-translation.ts` for Zod schemas |
| Switcher | `src/components/layouts/LanguageSwitcher.tsx` — `MainLayout` header + `AuthPageLayout` (auth pages) |
| RTL | Urdu sets `dir="rtl"` on `<html>` |
| Migration | ~30 files: `useIntl` → `useT()` |

### Usage

```tsx
import { useT } from '@/hooks/use-t';

const { t, locale, setLocale } = useT();
t('commerce.addToCart', 'Add to cart');
t('commerce.orderNumber', 'Order #{id}', { id: 5 });
```

### Acceptance criteria

- [x] Shell, commerce, admin, and auth strings translatable
- [x] Language switcher (EN / اردو) in `MainLayout` header and `AuthPageLayout` (login / register / forgot password)
- [x] Locale persisted; fallback to English for missing Urdu keys

### Verify

1. Run app → switch to **اردو** in header  
2. Menu, dashboard, products show Urdu labels  
3. Reload → locale retained  

```bash
pnpm run verify:build
```

---

## Remaining stories (summary)

### US-8.1 — Product search and filters

Debounced search on name/SKU; category chips; optional price range; empty state.

**Likely touch:** `ProductsPage.tsx`, `products.ts` service (query params).

### US-8.2 — Product images

Image URL on model; grid cards with photo, price, stock hint.

### US-8.3 — Wishlist

Per-user saved products; move to cart in one action.

### US-8.4 — Order tracking timeline

Visual steps: `pending` → `confirmed` → paid; cancelled distinct.

### US-8.5 — Toasts

Add-to-cart, checkout success, payment update feedback.

### US-8.6 — Dark mode

Theme toggle; Tailwind/CSS variables; persisted preference.

### US-8.7 — Pagination

Server/client pagination on products/orders; virtualized admin tables.

### US-8.8 — Admin analytics

Dashboard widgets: product count, low stock, recent orders, revenue.

### US-8.9 — Export

CSV for filtered lists; PDF receipt for orders.

### US-8.11 — PWA

Web manifest + service worker; offline banner when API down.

### US-8.12 — OpenAPI codegen

Regenerate client from backend OpenAPI; optional CI check.

### US-8.13 — TanStack Query

Query keys per resource; invalidate cart/orders on mutations.

### US-8.14 — Playwright E2E

Seed + login + cart + checkout in CI.

### US-8.15 — Observability

Correlation ID header; optional Sentry.

---

## Suggested next picks

1. **8.1** Product search — quick win on `ProductsPage`  
2. **8.5** Toasts — better UX across commerce  
3. **8.8** Admin analytics — uses existing APIs  

---

## Related

- Phase index: [README.md](./README.md)  
- i18n locale files: `src/locales/`  
- Architecture US details: [architecture.md](../architecture.md#phase-8--nice-to-have-enhancements-optional)

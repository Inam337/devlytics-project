# Phase 3 — API layer scaffolding (all domains)

**Status:** ✅ Complete  
**Goal:** TypeScript models and domain services for every backend resource — pages call services, not axios directly.

---

## Context

All services return `ApiResult<T>` via `src/libs/api-request.ts` for consistent success/error handling. Models mirror backend entity field names from `backend/myapp/docs/api-reference.md`.

---

## User stories

### US-3.1 — TypeScript models per resource

- [x] Models for Product, Category, Customer, Supplier, Stock, Cart, Order, Payment, Purchase, Sale, User, enums
- [x] Barrel export `models/index.ts`
- [x] No `any` in service return types

### US-3.2 — Domain service modules

- [x] One file per backend area under `src/services/`
- [x] Consistent naming: `listProducts`, `getProduct`, `createProduct`, …
- [x] All use `apiClient` only

### US-3.3 — Loading and error UX conventions

- [x] `CommercePageState` pattern for loading / error / empty (commerce)
- [x] `FieldError` for form validation
- [ ] Team-wide copy of pattern on every legacy screen (ongoing)

---

## Service map

| Service | Backend | Priority |
|---------|---------|----------|
| `auth.ts` | `/auth/*` | P0 |
| `products.ts` | `/products` | P0 |
| `categories.ts` | `/categories` | P0 |
| `cart.ts`, `cart-items.ts` | `/cart`, `/cart-items` | P0 |
| `orders.ts` | `/orders`, checkout | P0 |
| `payments.ts` | `/payments` | P1 |
| `customers.ts` | `/customers` | P2 |
| `suppliers.ts` | `/suppliers` | P2 |
| `stock.ts` | `/stocks` | P2 |
| `purchases.ts`, `purchase-items.ts` | purchases | P2 |
| `sales.ts`, `sale-items.ts` | sales | P2 |
| `users.ts` | `/users` | P3 |

---

## Key files

| Path | Role |
|------|------|
| `src/models/` | Entity and DTO types |
| `src/services/*.ts` | Domain API wrappers |
| `src/libs/api-request.ts` | `ApiResult`, error mapping |
| `src/libs/axios.ts` | HTTP client |

---

## Pattern

```ts
export async function listProducts(): Promise<ApiResult<Product[]>> {
  return apiRequest(() =>
    apiClient.get<Product[]>(AppConstants.ApiUrls.Products),
  );
}
```

---

## Verify

- Import any model from `@/models`
- Services compile without `any` on CRUD returns
- `pnpm run verify:regression` exercises products, cart, orders, admin CRUD

---

## Next phase

→ [04-commerce.md](./04-commerce.md)

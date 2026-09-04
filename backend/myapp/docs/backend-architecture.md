# Zentro backend (NestJS) — architecture & implementation context

This document captures how the **eCommerce-oriented** NestJS API in `backend/myapp` is structured, the conventions enforced, and the modules added or refactored (as of the work summarized here).

---

## Stack

- **Runtime:** Node.js  
- **Framework:** NestJS 11  
- **ORM:** TypeORM 0.3 + **PostgreSQL**  
- **Validation:** `class-validator` + `class-transformer` (global `ValidationPipe` in `src/main.ts`)  
- **Auth:** JWT (`@nestjs/jwt`, `passport-jwt`), `JwtAuthGuard` exported from `AuthModule`

---

## Global conventions

| Rule | Implementation |
|------|----------------|
| No entities in controllers | Controllers use **DTOs** only for `@Body()` / query params. |
| Validated input | DTOs with `class-validator`; global pipe: `whitelist`, `forbidNonWhitelisted`, `transform: true`. |
| Module → service → repository | Feature **repository** classes wrap `@InjectRepository()`; services hold business logic. |
| Relation inputs use IDs | Request DTOs accept fields like `categoryId`, `productId`, `supplierId`, `purchaseId`, `saleId`, `orderId`; services resolve entities before save. |
| Do not trust client prices | Cart/order flows read **DB product price**; order lines store a **price snapshot**. |
| Soft-delete products | `Product.isActive`; `DELETE /products/:id` sets `isActive = false` (no hard delete). |
| Relations in reads | Repositories define relation-aware list/detail methods for resources that expose related rows. |

---

## Folder layout (feature modules under `src/`)

```
src/
  auth/
  cart/                 # cart + cart entities (Cart, CartItem live here)
  cart-item/            # cart line HTTP + repository/service
  category/
  common/decorators/    # e.g. CurrentUserId
  config/               # TypeORM DataSource options
  customers/
  entities/             # shared domain entities (Product, Users, …)
  order/
  order-item/
  payment/
  product/
  purchase/
  purchase-item/
  sale/
  sale-item/
  stock/
  supplier/
  users/
```

> **Note:** The codebase uses `src/<feature>/` rather than `src/modules/<feature>/`. You can rename to `modules/` later if desired; update imports accordingly.

---

## Database registration

All TypeORM entities used by the app are listed in:

- `src/config/database.config.ts` → `DatabaseConfigOptions.entities`

Includes **Cart**, **CartItem**, **Order**, **OrderItem** in addition to existing domain entities (Customer, Users, Category, Product, Stock, purchases, sales, supplier, etc.).

`synchronize: true` is enabled for development convenience; **turn off in production** and use migrations.

---

## Product module

### Entity (`src/entities/product.entity.ts`)

- Table: `products`
- Fields include: `name`, `description`, `sku`, `price`, `unit`, `reorderLevel`, **`type`** (`ProductType` enum), **`isActive`** (default `true`)
- `ProductType` enum definition: `src/entities/product-type.enum.ts`
- Relations: `ManyToOne` → `Category`, `OneToMany` → `Stock`

### DTOs

- `src/product/dto/create-product.dto.ts` — required/optional fields + `categoryId` optional
- `src/product/dto/update-product.dto.ts` — `PartialType(CreateProductDto)` via `@nestjs/mapped-types`

### Repository

- `src/product/product.repository.ts` — create/save, find active catalog, find by id (with/without active filter), merge/save updates

### Service

- `src/product/product.service.ts` — validates category when `categoryId` provided; list only **active** products; update merges partial DTO; remove = **soft delete**

### Controller

- `src/product/product.controller.ts` — `ParseIntPipe` on `:id`; no `Partial<Product>` in bodies

### Module

- `src/product/product.module.ts` — registers `Product` + `Category`; exports **`ProductRepository`** and `TypeOrmModule` for other modules (e.g. cart) that need `Product` repository access

---

## Cart & cart item

### Entities

- `src/cart/entities/cart.entity.ts` — `user` (`ManyToOne` → `Users`), `items` (`OneToMany` → `CartItem`, cascade)
- `src/cart/entities/cart-item.entity.ts` — `cart`, `product`, `quantity`

### Cart module

- **Repository:** `src/cart/cart.repository.ts`
- **Service:** `src/cart/cart.service.ts` — get-or-create cart; `addToCart` merges quantity if line exists; only **active** products
- **Controller:** `src/cart/cart.controller.ts` — JWT required; `CurrentUserId` decorator
- **DTO:** `src/cart/dto/add-to-cart.dto.ts`

**Routes**

| Method | Path | Description |
|--------|------|----------------|
| GET | `/cart` | Current user’s cart (with items + product relations) |
| POST | `/cart/items` | Body: `{ productId, quantity }` |
| DELETE | `/cart` | Clear current user’s cart |

### Cart item module

- **Repository:** `src/cart-item/cart-item.repository.ts` — ownership scoped by `cart.user.id`
- **Service:** `src/cart-item/cart-item.service.ts`
- **Controller:** `src/cart-item/cart-item.controller.ts`
- **DTO:** `src/cart-item/dto/update-cart-item.dto.ts`

**Routes**

| Method | Path | Description |
|--------|------|----------------|
| PATCH | `/cart-items/:id` | Update line quantity |
| DELETE | `/cart-items/:id` | Remove line |

---

## Order & order item

### Entities & enums

- `src/entities/order-status.enum.ts` — e.g. `pending`, `confirmed`, `cancelled`
- `src/order/entities/order.entity.ts` — `user`, `totalAmount` (decimal string), `status`, `items` (cascade)
- `src/order-item/entities/order-item.entity.ts` — `order`, `product`, `quantity`, **`price`** (snapshot at checkout)

### Order module

- **Repository:** `src/order/order.repository.ts`
- **Service:** `src/order/order.service.ts` — **`createOrder(userId)`** runs in a **transaction**:
  1. Load cart + items + products  
  2. Reject inactive products  
  3. Sum totals from **numeric product price × quantity**  
  4. Persist `Order` + `OrderItem` rows with per-line **stored price**  
  5. **Clear cart** (`delete` cart items for that cart)
- **Controller:** `src/order/order.controller.ts`

**Routes**

| Method | Path | Description |
|--------|------|----------------|
| POST | `/orders/checkout` | Checkout current cart → order |
| GET | `/orders` | List current user’s orders |
| GET | `/orders/:id` | Order detail + items (scoped to user) |
| PUT | `/orders/:id/status` | Body: `{ status }` where status is `pending`, `confirmed`, or `cancelled` |
| DELETE | `/orders/:id` | Delete current user’s order |

### Order item module

- **Repository / service / controller** under `src/order-item/`
- **Routes:** `GET /order-items`, `GET /order-items/:id` — list/detail only for lines whose parent order belongs to the user

---

## Auth integration for user-scoped modules

- `src/auth/auth.module.ts` exports **`JwtAuthGuard`** and **`JwtModule`** so feature modules can apply `@UseGuards(JwtAuthGuard)` without duplicate JWT setup.
- `src/common/decorators/current-user-id.decorator.ts` — `@CurrentUserId()` reads `request.user.userId` (compatible with JWT payload / strategy shape used in this app).
- Cart, cart item, order, order item, and payment APIs are scoped to the authenticated user.

---

## Product-style CRUD modules

The following modules now follow the same convention as `product`: controller DTOs, service business logic, repository wrappers, `ParseIntPipe` for route IDs, and relation-aware reads where needed.

### Category

- Entity: `src/entities/category.entity.ts`
- DTOs: `src/category/dto/create-category.dto.ts`, `update-category.dto.ts`
- Repository: `src/category/category.repository.ts`
- Routes: `POST/GET /categories`, `GET/PUT/DELETE /categories/:id`

### Customers

- Entity: `src/entities/customer.entity.ts`
- DTOs: `src/customers/dto/create-customer.dto.ts`, `update-customer.dto.ts`
- Repository: `src/customers/customers.repository.ts`
- Routes: `POST/GET /customers`, `GET/PUT/DELETE /customers/:id`

### Supplier

- Entity: `src/entities/supplier.entity.ts`
- DTOs: `src/supplier/dto/create-supplier.dto.ts`, `update-supplier.dto.ts`
- Repository: `src/supplier/supplier.repository.ts`
- Routes: `POST/GET /suppliers`, `GET/PUT/DELETE /suppliers/:id`

### Stock

- Entity: `src/entities/stock.entity.ts`
- DTOs: `src/stock/dto/create-stock.dto.ts`, `update-stock.dto.ts`
- Repository: `src/stock/stock.repository.ts`
- Service resolves `productId` and rejects missing/inactive products
- Routes: `POST/GET /stocks`, `GET/PUT/DELETE /stocks/:id`

---

## Purchase & purchase item

### Entities

- `src/entities/purchase.entity.ts` — optional supplier, purchase items, total amount, purchased timestamp
- `src/entities/purchase.item.entity.ts` — purchase, product, quantity, unit price

### Purchase module

- DTOs: `src/purchase/dto/create-purchase.dto.ts`, `update-purchase.dto.ts`, `purchase-line.dto.ts`
- Repository: `src/purchase/purchase.repository.ts`
- Service resolves `supplierId` and nested item `productId` values, computes `totalAmount` server-side, and rejects empty item lists
- Routes: `POST/GET /purchases`, `GET/PUT/DELETE /purchases/:id`

Create/update body shape:

```json
{
  "supplierId": 1,
  "items": [
    {
      "productId": 1,
      "quantity": 10,
      "unitPrice": 2000
    }
  ]
}
```

### Purchase item module

- DTOs: `src/purchase-item/dto/create-purchase-item.dto.ts`, `update-purchase-item.dto.ts`
- Repository: `src/purchase-item/purchase.item.repository.ts`
- Service resolves `purchaseId` and `productId`
- Routes: `POST/GET /purchase-items`, `GET/PUT/DELETE /purchase-items/:id`

---

## Sale & sale item

### Entities

- `src/entities/sale.entity.ts` — sale items, total amount, sold timestamp
- `src/entities/sale.item.entity.ts` — sale, product, quantity, unit price

### Sale module

- DTOs: `src/sale/dto/create-sale.dto.ts`, `update-sale.dto.ts`, `sale-line.dto.ts`
- Repository: `src/sale/sale.repository.ts`
- Service resolves nested item `productId` values, computes `totalAmount` server-side, and rejects empty item lists
- Routes: `POST/GET /sales`, `GET/PUT/DELETE /sales/:id`

Create/update body shape:

```json
{
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "unitPrice": 2500
    }
  ]
}
```

### Sale item module

- DTOs: `src/sale-item/dto/create-sale-item.dto.ts`, `update-sale-item.dto.ts`
- Repository: `src/sale-item/sale.item.repository.ts`
- Service resolves `saleId` and `productId`
- Routes: `POST/GET /sale-items`, `GET/PUT/DELETE /sale-items/:id`

---

## Environment & config

- **Config:** `@nestjs/config` — `ConfigModule.forRoot({ isGlobal: true })` in `AppModule`
- **DB:** `DatabaseConfigOptions` in `src/config/database.config.ts` (env-driven host, port, credentials, DB name)
- **JWT secrets / expiry:** env vars consumed in `auth` module (`JWT_SECRET`, `JWT_REFRESH_SECRET`, etc.) — use `getOrThrow` where required

---

## App entry

- `src/main.ts` — global `ValidationPipe`; default port from `process.env.PORT ?? 3000`
- OpenAPI JSON is served at `/api.json`; Swagger UI at `/swagger`; Scalar API Reference at `/reference`
- `src/app.module.ts` — imports all feature modules including **Cart**, **CartItem**, **Order**, **OrderItem**, **Payment**

---

## Payment module

Payments are created **after** the order exists: **Cart → Order → Payment**.

### Entities & enums

- `src/payment/entities/payment.entity.ts` — `ManyToOne` → `Order` (`onDelete: 'CASCADE'`), `amount` (decimal string, copied from `order.totalAmount` at creation), `method`, `status`, optional `transactionId`
- `src/payment/enums/payment-method.enum.ts` — `COD`, `STRIPE`, `JAZZCASH`, `EASYPAISA`
- `src/payment/enums/payment-status.enum.ts` — `PENDING`, `SUCCESS`, `FAILED`

### Order changes

- `src/order/entities/order.entity.ts` — `payments` (`OneToMany` → `Payment`), **`isPaid`** (boolean, default `false`); set to `true` when a payment moves to `SUCCESS`

### API (JWT required)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/payments` | Body: `{ orderId, method }` — creates payment; **amount** is always the order’s stored total (never from client). Order must belong to the authenticated user. |
| GET | `/payments` | List current user’s payments. |
| GET | `/payments/:id` | Payment detail scoped to the current user. |
| PUT | `/payments/:id/status` | Body: `{ status, transactionId? }` — updates payment; on `success`, marks order **paid**. Only the **order owner** may call (webhook integration should use a separate guarded route or secret in production). |
| DELETE | `/payments/:id` | Delete a payment scoped to the current user. |

### Files

- DTOs: `src/payment/dto/create-payment.dto.ts`, `update-payment-status.dto.ts`
- `src/payment/payment.repository.ts`, `payment.service.ts`, `payment.controller.ts`, `payment.module.ts`
- Registered in `database.config.ts` and `app.module.ts`

---

## Maintenance checklist

1. **Production:** disable TypeORM `synchronize`; add proper migrations.  
2. **Security:** ensure `.env` holds strong secrets; never commit `.env`.  
3. **Indexes:** consider unique constraint “one open cart per user” at DB level if you enforce that invariant.  
4. **API versioning:** optional `/v1` prefix for public API stability.  
5. **OpenAPI:** keep DTOs current so Swagger/Scalar schemas stay useful.

---

## Related files (quick index)

| Area | Files |
|------|--------|
| Product | `src/product/*`, `src/entities/product.entity.ts`, `src/entities/product-type.enum.ts` |
| Category | `src/category/*`, `src/entities/category.entity.ts` |
| Customers | `src/customers/*`, `src/entities/customer.entity.ts` |
| Supplier | `src/supplier/*`, `src/entities/supplier.entity.ts` |
| Stock | `src/stock/*`, `src/entities/stock.entity.ts` |
| Purchase | `src/purchase/*`, `src/entities/purchase.entity.ts` |
| Purchase item | `src/purchase-item/*`, `src/entities/purchase.item.entity.ts` |
| Sale | `src/sale/*`, `src/entities/sale.entity.ts` |
| Sale item | `src/sale-item/*`, `src/entities/sale.item.entity.ts` |
| Cart | `src/cart/*` |
| Cart item | `src/cart-item/*` |
| Order | `src/order/*`, `src/entities/order-status.enum.ts` |
| Order item | `src/order-item/*` |
| Payment | `src/payment/*` |
| Auth guard export | `src/auth/auth.module.ts`, `src/auth/jwt-auth.guard.ts` |
| Current user | `src/common/decorators/current-user-id.decorator.ts` |
| DB entity list | `src/config/database.config.ts` |
| App wiring | `src/app.module.ts`, `src/main.ts` |

---

*Generated as project context documentation for contributors and future refactors.*

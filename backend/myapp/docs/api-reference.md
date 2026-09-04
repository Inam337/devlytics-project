# Zentro API reference

This file lists the current HTTP API exposed by `backend/myapp`.

## Base URLs

- App: `http://localhost:3000`
- Scalar API Reference: `http://localhost:3000/reference`
- Swagger UI: `http://localhost:3000/swagger`
- OpenAPI JSON: `http://localhost:3000/api.json`

## Auth

Protected routes require:

```http
Authorization: Bearer <accessToken>
```

### Auth endpoints

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/auth/register` | No | `{ "name": "Ali", "email": "ali@example.com", "password": "password123" }` |
| POST | `/auth/login` | No | `{ "email": "ali@example.com", "password": "password123" }` |
| POST | `/auth/refresh-token` | No | `{ "refreshToken": "<refreshToken>" }` |
| POST | `/auth/change-password` | Yes | `{ "currentPassword": "password123", "newPassword": "newPassword123" }` |

## Root

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Returns app hello response. |

## Users

| Method | Path | Auth | Body / Description |
|--------|------|------|--------------------|
| GET | `/users` | No | List users. |
| GET | `/users/:id` | No | Get one user. |
| POST | `/users` | No | `{ "name": "Ali", "email": "ali@example.com", "password": "password123" }` |
| PATCH | `/users/:id` | No | Partial user body, for example `{ "name": "Ali Updated" }` |
| PATCH | `/users/:id/status` | No | `{ "isActive": true }` |
| DELETE | `/users/:id` | No | Delete user. |

## Products

Product `type` values: `goods`, `service`, `digital`.

| Method | Path | Auth | Body / Description |
|--------|------|------|--------------------|
| GET | `/products` | No | List active products with category and stock entries. |
| GET | `/products/:id` | No | Get active product by id. |
| POST | `/products` | No | Create product. |
| PUT | `/products/:id` | No | Update product. |
| DELETE | `/products/:id` | No | Soft delete product by setting `isActive = false`. |

Create/update example:

```json
{
  "name": "Rice Bag",
  "description": "Premium rice",
  "price": 2500,
  "reorderLevel": 10,
  "unit": "bag",
  "sku": "RICE-25KG",
  "type": "goods",
  "categoryId": 1
}
```

## Categories

| Method | Path | Auth | Body / Description |
|--------|------|------|--------------------|
| GET | `/categories` | No | List categories with products. |
| GET | `/categories/:id` | No | Get one category. |
| POST | `/categories` | No | `{ "name": "Grocery", "description": "Daily grocery items" }` |
| PUT | `/categories/:id` | No | `{ "name": "Updated Grocery", "description": "Updated description" }` |
| DELETE | `/categories/:id` | No | Delete category. |

## Customers

| Method | Path | Auth | Body / Description |
|--------|------|------|--------------------|
| GET | `/customers` | No | List customers. |
| GET | `/customers/:id` | No | Get one customer. |
| POST | `/customers` | No | `{ "name": "Customer One", "email": "customer@example.com", "phone": "03001234567", "address": "Lahore" }` |
| PUT | `/customers/:id` | No | Partial customer body. |
| DELETE | `/customers/:id` | No | Delete customer. |

## Suppliers

| Method | Path | Auth | Body / Description |
|--------|------|------|--------------------|
| GET | `/suppliers` | No | List suppliers with purchases. |
| GET | `/suppliers/:id` | No | Get one supplier. |
| POST | `/suppliers` | No | `{ "name": "ABC Supplier", "contactNumber": "03001234567", "address": "Karachi" }` |
| PUT | `/suppliers/:id` | No | Partial supplier body. |
| DELETE | `/suppliers/:id` | No | Delete supplier. |

## Stock

| Method | Path | Auth | Body / Description |
|--------|------|------|--------------------|
| GET | `/stocks` | No | List stock entries with products. |
| GET | `/stocks/:id` | No | Get one stock entry. |
| POST | `/stocks` | No | `{ "productId": 1, "quantity": 100, "location": "Main Warehouse" }` |
| PUT | `/stocks/:id` | No | Partial stock body. |
| DELETE | `/stocks/:id` | No | Delete stock entry. |

## Cart

All cart routes require JWT auth and operate on the current user.

| Method | Path | Auth | Body / Description |
|--------|------|------|--------------------|
| GET | `/cart` | Yes | Get or create current user's cart. |
| POST | `/cart/items` | Yes | `{ "productId": 1, "quantity": 2 }` |
| DELETE | `/cart` | Yes | Clear current user's cart. |

## Cart Items

All cart item routes require JWT auth and are scoped to the current user's cart.

| Method | Path | Auth | Body / Description |
|--------|------|------|--------------------|
| PATCH | `/cart-items/:id` | Yes | `{ "quantity": 3 }` |
| DELETE | `/cart-items/:id` | Yes | Remove cart item. |

## Orders

Order routes require JWT auth and are scoped to the current user.

Order `status` values: `pending`, `confirmed`, `cancelled`.

| Method | Path | Auth | Body / Description |
|--------|------|------|--------------------|
| POST | `/orders/checkout` | Yes | Create order from current cart and clear cart items. |
| GET | `/orders` | Yes | List current user's orders. |
| GET | `/orders/:id` | Yes | Get current user's order. |
| PUT | `/orders/:id/status` | Yes | `{ "status": "confirmed" }` |
| DELETE | `/orders/:id` | Yes | Delete current user's order. |

## Order Items

Order item routes require JWT auth and are scoped through the parent order owner.

| Method | Path | Auth | Body / Description |
|--------|------|------|--------------------|
| GET | `/order-items` | Yes | List current user's order items. |
| GET | `/order-items/:id` | Yes | Get one current-user order item. |

## Payments

Payment routes require JWT auth and are scoped through the parent order owner.

Payment `method` values: `cod`, `stripe`, `jazzcash`, `easypaisa`.
Payment `status` values: `pending`, `success`, `failed`.

| Method | Path | Auth | Body / Description |
|--------|------|------|--------------------|
| POST | `/payments` | Yes | `{ "orderId": 1, "method": "cod" }` |
| GET | `/payments` | Yes | List current user's payments. |
| GET | `/payments/:id` | Yes | Get current user's payment. |
| PUT | `/payments/:id/status` | Yes | `{ "status": "success", "transactionId": "TXN-123" }` |
| DELETE | `/payments/:id` | Yes | Delete current user's payment. |

## Purchases

Purchase totals are calculated server-side from item quantity and unit price.

| Method | Path | Auth | Body / Description |
|--------|------|------|--------------------|
| GET | `/purchases` | No | List purchases with supplier and items. |
| GET | `/purchases/:id` | No | Get one purchase. |
| POST | `/purchases` | No | Create purchase with nested items. |
| PUT | `/purchases/:id` | No | Update supplier and/or replace nested items. |
| DELETE | `/purchases/:id` | No | Delete purchase. |

Create/update example:

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

## Purchase Items

| Method | Path | Auth | Body / Description |
|--------|------|------|--------------------|
| GET | `/purchase-items` | No | List purchase items with purchase and product. |
| GET | `/purchase-items/:id` | No | Get one purchase item. |
| POST | `/purchase-items` | No | `{ "purchaseId": 1, "productId": 1, "quantity": 10, "unitPrice": 2000 }` |
| PUT | `/purchase-items/:id` | No | Partial purchase item body. |
| DELETE | `/purchase-items/:id` | No | Delete purchase item. |

## Sales

Sale totals are calculated server-side from item quantity and unit price.

| Method | Path | Auth | Body / Description |
|--------|------|------|--------------------|
| GET | `/sales` | No | List sales with items and products. |
| GET | `/sales/:id` | No | Get one sale. |
| POST | `/sales` | No | Create sale with nested items. |
| PUT | `/sales/:id` | No | Replace sale items and recalculate total. |
| DELETE | `/sales/:id` | No | Delete sale. |

Create/update example:

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

## Sale Items

| Method | Path | Auth | Body / Description |
|--------|------|------|--------------------|
| GET | `/sale-items` | No | List sale items with sale and product. |
| GET | `/sale-items/:id` | No | Get one sale item. |
| POST | `/sale-items` | No | `{ "saleId": 1, "productId": 1, "quantity": 2, "unitPrice": 2500 }` |
| PUT | `/sale-items/:id` | No | Partial sale item body. |
| DELETE | `/sale-items/:id` | No | Delete sale item. |

## Suggested Scalar test flow

1. Register: `POST /auth/register`.
2. Login: `POST /auth/login`.
3. Copy the access token into Scalar's auth header as `Bearer <accessToken>`.
4. Create category, product, supplier, and stock.
5. Add a product to cart with `POST /cart/items`.
6. Checkout with `POST /orders/checkout`.
7. Create payment with `POST /payments`.
8. Update payment status with `PUT /payments/:id/status`.

/**
 * Phase 7 API regression — run against a live Nest API (local or staging).
 *
 *   API_BASE=http://localhost:3000 node scripts/verify-regression.mjs
 *   pnpm run verify:regression
 *
 * Prerequisites: API up, demo seed loaded (`pnpm run seed:demo` in backend/myapp).
 */

import { createApiClient, assert } from './lib/api-request.mjs';

const API_BASE = (process.env.API_BASE ?? 'http://localhost:3000').replace(/\/$/, '');
const { request } = createApiClient(API_BASE);

const SHOPPER = {
  email: 'shopper@zentro.demo',
  password: 'ShopDemo123!',
};

const ADMIN = {
  email: 'admin@zentro.demo',
  password: 'ShopDemo123!',
};

async function login(credentials) {
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  assert(res.status === 200 || res.status === 201, `login status ${res.status}`);
  assert(res.body?.success === true, 'login success flag');
  assert(typeof res.body?.token === 'string', 'login token');

  return res.body;
}

async function section(title, fn) {
  process.stdout.write(`\n▸ ${title}\n`);
  await fn();
}

async function main() {
  console.log(`Zentro API regression against ${API_BASE}`);

  let shopperToken = '';
  let shopperRefresh = '';
  let adminToken = '';

  await section('1. Auth — login, refresh, invalid credentials', async () => {
    const shopper = await login(SHOPPER);
    shopperToken = shopper.token;
    shopperRefresh = shopper.refreshToken;
    console.log('  ✓ shopper login');

    const bad = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: SHOPPER.email, password: 'wrong-password' }),
    });
    assert(bad.status === 401, `invalid login status ${bad.status}`);
    console.log('  ✓ invalid credentials → 401');

    const refresh = await request('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: shopperRefresh }),
    });
    assert(refresh.status === 200 || refresh.status === 201, `refresh status ${refresh.status}`);
    assert(typeof refresh.body?.token === 'string', 'refresh token');
    shopperToken = refresh.body.token;
    console.log('  ✓ refresh token');

    const admin = await login(ADMIN);
    adminToken = admin.token;
    console.log('  ✓ admin login');
  });

  await section('2. Commerce — products → cart → checkout → COD payment', async () => {
    const products = await request('/products');
    assert(products.status === 200, `GET /products status ${products.status}`);
    assert(Array.isArray(products.body) && products.body.length > 0, 'products list');
    const productId = products.body[0].id;
    console.log(`  ✓ GET /products (${products.body.length} items)`);

    const add = await request('/cart/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${shopperToken}` },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    assert(add.status === 200 || add.status === 201, `add to cart status ${add.status}`);
    console.log('  ✓ POST /cart/items');

    const cart = await request('/cart', {
      headers: { Authorization: `Bearer ${shopperToken}` },
    });
    assert(cart.status === 200, `GET /cart status ${cart.status}`);
    assert(cart.body?.items?.length > 0, 'cart has items');
    console.log('  ✓ GET /cart');

    const order = await request('/orders/checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${shopperToken}` },
    });
    assert(order.status === 200 || order.status === 201, `checkout status ${order.status}`);
    assert(order.body?.id, 'order id');
    console.log(`  ✓ POST /orders/checkout → order #${order.body.id}`);

    const payment = await request('/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${shopperToken}` },
      body: JSON.stringify({ orderId: order.body.id, method: 'cod' }),
    });
    assert(payment.status === 200 || payment.status === 201, `payment status ${payment.status}`);
    console.log('  ✓ POST /payments (cod)');
  });

  const stamp = Date.now();

  await section('3. Admin — category → product → stock', async () => {
    const category = await request('/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: `Regression Cat ${stamp}`,
        description: 'Phase 7 regression',
      }),
    });
    assert(category.status === 200 || category.status === 201, `create category status ${category.status}`);
    const categoryId = category.body?.id;
    assert(categoryId, 'category id');
    console.log(`  ✓ POST /categories → #${categoryId}`);

    const product = await request('/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: `Regression Product ${stamp}`,
        price: 199,
        unit: 'piece',
        reorderLevel: 5,
        type: 'goods',
        categoryId,
        sku: `REG-${stamp}`,
      }),
    });
    assert(product.status === 200 || product.status === 201, `create product status ${product.status}`);
    const productId = product.body?.id;
    assert(productId, 'product id');
    console.log(`  ✓ POST /products → #${productId}`);

    const stock = await request('/stocks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        productId,
        quantity: 12,
        location: `Regression Bay ${stamp}`,
      }),
    });
    assert(stock.status === 200 || stock.status === 201, `create stock status ${stock.status}`);
    console.log('  ✓ POST /stocks');
  });

  await section('4. Validation — bad DTO returns 400', async () => {
    const badCategory = await request('/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({}),
    });
    assert(badCategory.status === 400, `bad category status ${badCategory.status}`);
    console.log('  ✓ POST /categories {} → 400');

    const badProduct = await request('/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'No price' }),
    });
    assert(badProduct.status === 400, `bad product status ${badProduct.status}`);
    console.log('  ✓ POST /products invalid → 400');
  });

  await section('5. Unauthorized — missing JWT returns 401', async () => {
    const noAuth = await request('/cart');
    assert(noAuth.status === 401, `unauthenticated cart status ${noAuth.status}`);
    console.log('  ✓ GET /cart without token → 401');
  });

  console.log('\nAll Phase 7 regression checks passed.\n');
}

main().catch((err) => {
  console.error('\nRegression failed:', err.message);
  process.exit(1);
});

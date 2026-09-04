/**
 * Verifies demo seed data (catalog, cart, orders, stock).
 * Requires API running: pnpm run start:dev (backend/myapp)
 *
 *   pnpm run verify:seed
 *   API_BASE=http://localhost:3000 pnpm run verify:seed
 */

import { createApiClient, assert } from './lib/api-request.mjs';

const API_BASE = (process.env.API_BASE ?? 'http://localhost:3000').replace(/\/$/, '');
const { request } = createApiClient(API_BASE);

async function main() {
  console.log(`Verifying demo seed against ${API_BASE}\n`);

  const products = await request('/products');
  assert(products.status === 200, `GET /products status ${products.status}`);
  assert(Array.isArray(products.body) && products.body.length >= 12, `expected ≥12 products, got ${products.body?.length ?? 0}`);
  const categories = new Set(products.body.map(p => p.category?.name).filter(Boolean));
  assert(categories.size >= 4, `expected ≥4 categories in products, got ${categories.size}`);
  console.log(`✓ GET /products — ${products.body.length} products, ${categories.size} categories`);

  const stocks = await request('/stocks');
  assert(stocks.status === 200, `GET /stocks status ${stocks.status}`);
  assert(Array.isArray(stocks.body) && stocks.body.length > 0, 'stocks list empty');
  console.log(`✓ GET /stocks — ${stocks.body.length} entries`);

  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'shopper@zentro.demo',
      password: 'ShopDemo123!',
    }),
  });
  assert(login.status === 200 || login.status === 201, `login status ${login.status}`);
  assert(login.body?.success === true, 'login failed');
  const token = login.body.token;
  console.log('✓ shopper@zentro.demo login');

  const cart = await request('/cart', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(cart.status === 200, `GET /cart status ${cart.status}`);
  assert(cart.body?.items?.length === 2, `expected 2 cart lines, got ${cart.body?.items?.length ?? 0}`);
  console.log(`✓ GET /cart — ${cart.body.items.length} lines (earbuds + mango juice)`);

  const orders = await request('/orders', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(orders.status === 200, `GET /orders status ${orders.status}`);
  assert(Array.isArray(orders.body) && orders.body.length >= 2, `expected ≥2 orders, got ${orders.body?.length ?? 0}`);
  console.log(`✓ GET /orders — ${orders.body.length} orders`);

  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@zentro.demo',
      password: 'ShopDemo123!',
    }),
  });
  assert(adminLogin.body?.user?.role === 'admin', 'admin role');
  console.log('✓ admin@zentro.demo login');

  console.log('\nAll demo seed checks passed.\n');
}

main().catch((err) => {
  console.error('\nSeed verification failed:', err.message);
  console.error('Ensure PostgreSQL is up and run: cd backend/myapp && pnpm run seed:demo');
  console.error('Then start API: pnpm run start:dev');
  process.exit(1);
});

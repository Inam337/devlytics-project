/**
 * Phase 2 auth smoke test — hits the Nest API directly (default localhost:3000).
 * Run: node scripts/verify-phase2-auth.mjs
 * Optional: API_BASE=http://localhost:3000 node scripts/verify-phase2-auth.mjs
 */

const API_BASE = (process.env.API_BASE ?? 'http://localhost:3000').replace(/\/$/, '');

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log(`Verifying Phase 2 auth against ${API_BASE}\n`);

  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'shopper@zentro.demo',
      password: 'ShopDemo123!',
    }),
  });
  assert(login.status === 201 || login.status === 200, `login status ${login.status}`);
  assert(login.body?.success === true, 'login success flag');
  assert(typeof login.body?.token === 'string', 'login token');
  assert(typeof login.body?.refreshToken === 'string', 'login refreshToken');
  assert(login.body?.user?.email === 'shopper@zentro.demo', 'login user email');
  console.log('✓ POST /auth/login');

  const badLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'shopper@zentro.demo', password: 'wrong' }),
  });
  assert(badLogin.status === 401, `bad login status ${badLogin.status}`);
  console.log('✓ POST /auth/login rejects invalid credentials');

  const uniqueEmail = `phase2.verify.${Date.now()}@zentro.demo`;
  const register = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Phase2 Verify',
      email: uniqueEmail,
      password: 'VerifyPass123!',
    }),
  });
  assert(register.status === 201 || register.status === 200, `register status ${register.status}`);
  assert(register.body?.success === true, 'register success flag');
  assert(typeof register.body?.token === 'string', 'register token');
  assert(register.body?.user?.email === uniqueEmail, 'register user email');
  console.log('✓ POST /auth/register');

  const duplicate = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Dup',
      email: uniqueEmail,
      password: 'VerifyPass123!',
    }),
  });
  assert(duplicate.status === 409, `duplicate register status ${duplicate.status}`);
  console.log('✓ POST /auth/register rejects duplicate email');

  const refresh = await request('/auth/refresh-token', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: login.body.refreshToken }),
  });
  assert(refresh.status === 201 || refresh.status === 200, `refresh status ${refresh.status}`);
  assert(typeof refresh.body?.token === 'string', 'refresh token');
  assert(typeof refresh.body?.refreshToken === 'string', 'refresh refreshToken');
  console.log('✓ POST /auth/refresh-token');

  const cart = await request('/cart', {
    headers: { Authorization: `Bearer ${login.body.token}` },
  });
  assert(cart.status === 200, `authenticated GET /cart status ${cart.status}`);
  console.log('✓ GET /cart with Bearer token');

  console.log('\nAll Phase 2 auth checks passed.');
}

main().catch((err) => {
  console.error('\nPhase 2 auth verification failed:', err.message);
  process.exit(1);
});

-- =============================================================================
-- Zentro shop demo — SQL reference seed (PostgreSQL)
-- =============================================================================
-- Prefer the TypeScript seeder (handles bcrypt, relations, enums):
--   pnpm run seed:demo
--
-- Use this file only if you cannot run Node, after tables exist (boot API once).
-- Column names assume TypeORM default camelCase columns on PostgreSQL.
-- If inserts fail, inspect tables: \d products  and align column names.
-- =============================================================================

-- Optional reset (uncomment to wipe commerce data)
-- TRUNCATE TABLE payments, order_items, orders, cart_items, carts,
--   sale_item, sale, purchase_item, purchase, stock, products, category,
--   customer, supplier CASCADE;

-- Demo password: ShopDemo123!  (bcrypt hash below — same as TS seeder)
-- Regenerate with: node -e "require('bcrypt').hash('ShopDemo123!',10).then(console.log)"

INSERT INTO users (name, email, password, role, status, "createdAt", "updatedAt")
VALUES
  ('Ayesha Khan', 'shopper@zentro.demo',
   '$2b$10$AVYou.LxZvCK2pcj9AjQO.mrE.VZyKKJuW/x1lPQ9SmHz.sJNFiWq',
   'user', true, NOW(), NOW()),
  ('Omar Admin', 'admin@zentro.demo',
   '$2b$10$AVYou.LxZvCK2pcj9AjQO.mrE.VZyKKJuW/x1lPQ9SmHz.sJNFiWq',
   'admin', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Remaining rows (categories → products → stock → orders) are maintained in
-- scripts/seed-shop-demo.ts — run:  pnpm run seed:demo

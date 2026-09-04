/**
 * Zentro shop demo seed — end-to-end sample data for UI development.
 *
 * Prerequisites:
 *   - PostgreSQL running (defaults: localhost:5432, DB ShopDB — see database.config.ts)
 *   - Start the API once so TypeORM synchronize creates tables, OR run this after first boot
 *
 * Usage (from backend/myapp) — see docs/data.md:
 *   pnpm run seed:demo
 *   pnpm run seed:demo:fresh
 *   pnpm run seed | seed:fresh | mock:seed | mock:seed:fresh  (aliases)
 *
 * Demo logins (password for both: ShopDemo123!)
 *   shopper@zentro.demo  — cart + orders + payments
 *   admin@zentro.demo    — admin role for future RBAC UI
 */
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { DatabaseConfigOptions } from '../src/config/database.config';
import { Users } from '../src/entities/user.entity';
import { Category } from '../src/entities/category.entity';
import { Product } from '../src/entities/product.entity';
import { ProductType } from '../src/entities/product-type.enum';
import { Stock } from '../src/entities/stock.entity';
import { Supplier } from '../src/entities/supplier.entity';
import { Customer } from '../src/entities/customer.entity';
import { Purchase } from '../src/entities/purchase.entity';
import { PurchaseItem } from '../src/entities/purchase.item.entity';
import { Sale } from '../src/entities/sale.entity';
import { SaleItem } from '../src/entities/sale.item.entity';
import { Cart } from '../src/cart/entities/cart.entity';
import { CartItem } from '../src/cart/entities/cart-item.entity';
import { Order } from '../src/order/entities/order.entity';
import { OrderItem } from '../src/order-item/entities/order-item.entity';
import { OrderStatus } from '../src/entities/order-status.enum';
import { Payment } from '../src/payment/entities/payment.entity';
import { PaymentMethod } from '../src/payment/enums/payment-method.enum';
import { PaymentStatus } from '../src/payment/enums/payment-status.enum';

const DEMO_PASSWORD = 'ShopDemo123!';
const DEMO_EMAILS = ['shopper@zentro.demo', 'admin@zentro.demo'] as const;

const isFresh = process.argv.includes('--fresh');

async function clearCommerceData(ds: DataSource): Promise<void> {
  await ds.getRepository(Payment).createQueryBuilder().delete().execute();
  await ds.getRepository(OrderItem).createQueryBuilder().delete().execute();
  await ds.getRepository(Order).createQueryBuilder().delete().execute();
  await ds.getRepository(CartItem).createQueryBuilder().delete().execute();
  await ds.getRepository(Cart).createQueryBuilder().delete().execute();
  await ds.getRepository(SaleItem).createQueryBuilder().delete().execute();
  await ds.getRepository(Sale).createQueryBuilder().delete().execute();
  await ds.getRepository(PurchaseItem).createQueryBuilder().delete().execute();
  await ds.getRepository(Purchase).createQueryBuilder().delete().execute();
  await ds.getRepository(Stock).createQueryBuilder().delete().execute();
  await ds.getRepository(Product).createQueryBuilder().delete().execute();
  await ds.getRepository(Category).createQueryBuilder().delete().execute();
  await ds.getRepository(Customer).createQueryBuilder().delete().execute();
  await ds.getRepository(Supplier).createQueryBuilder().delete().execute();
  await ds
    .getRepository(Users)
    .createQueryBuilder()
    .delete()
    .where('email IN (:...emails)', { emails: [...DEMO_EMAILS] })
    .execute();
}

function lineTotal(qty: number, unitPrice: number): number {
  return Math.round(qty * unitPrice * 100) / 100;
}

async function seed(): Promise<void> {
  const ds = new DataSource(DatabaseConfigOptions);
  await ds.initialize();

  const categoryRepo = ds.getRepository(Category);
  const existing = await categoryRepo.count();
  if (existing > 0 && !isFresh) {
    console.log(
      'Seed skipped: categories already exist. Run with --fresh to wipe demo commerce data and re-seed.',
    );
    await ds.destroy();
    return;
  }

  if (isFresh || existing > 0) {
    console.log('Clearing demo commerce data...');
    await clearCommerceData(ds);
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const shopper = await ds.getRepository(Users).save({
    name: 'Ayesha Khan',
    email: DEMO_EMAILS[0],
    password: passwordHash,
    role: 'user',
    status: true,
  });

  await ds.getRepository(Users).save({
    name: 'Omar Admin',
    email: DEMO_EMAILS[1],
    password: passwordHash,
    role: 'admin',
    status: true,
  });

  const categories = await categoryRepo.save([
    {
      name: 'Grocery',
      description: 'Staples, rice, pulses, and cooking essentials',
    },
    {
      name: 'Beverages',
      description: 'Juices, water, and soft drinks',
    },
    {
      name: 'Electronics',
      description: 'Accessories and small gadgets',
    },
    {
      name: 'Personal Care',
      description: 'Hygiene and grooming',
    },
  ]);

  const [grocery, beverages, electronics, personalCare] = categories;

  const productRepo = ds.getRepository(Product);
  const products = await productRepo.save([
    {
      name: 'Super Basmati Rice 5kg',
      description: 'Premium aged basmati — ideal for biryani and pulao.',
      sku: 'GRC-RICE-5KG',
      price: 2499,
      unit: 'bag',
      reorderLevel: 15,
      type: ProductType.GOODS,
      isActive: true,
      category: grocery,
    },
    {
      name: 'Masoor Dal 1kg',
      description: 'Red lentils, quick cooking.',
      sku: 'GRC-DAL-1KG',
      price: 349,
      unit: 'pack',
      reorderLevel: 30,
      type: ProductType.GOODS,
      isActive: true,
      category: grocery,
    },
    {
      name: 'Extra Virgin Olive Oil 1L',
      description: 'Cold-pressed, salad and cooking.',
      sku: 'GRC-OIL-1L',
      price: 1899,
      unit: 'bottle',
      reorderLevel: 10,
      type: ProductType.GOODS,
      isActive: true,
      category: grocery,
    },
    {
      name: 'Fresh Milk 1L',
      description: 'UHT whole milk.',
      sku: 'GRC-MILK-1L',
      price: 280,
      unit: 'carton',
      reorderLevel: 40,
      type: ProductType.GOODS,
      isActive: true,
      category: grocery,
    },
    {
      name: 'Mango Juice 1L',
      description: 'No added sugar — breakfast favorite.',
      sku: 'BEV-MANGO-1L',
      price: 450,
      unit: 'pack',
      reorderLevel: 20,
      type: ProductType.GOODS,
      isActive: true,
      category: beverages,
    },
    {
      name: 'Mineral Water 6-Pack',
      description: '500ml bottles, office and home.',
      sku: 'BEV-WATER-6',
      price: 599,
      unit: 'pack',
      reorderLevel: 25,
      type: ProductType.GOODS,
      isActive: true,
      category: beverages,
    },
    {
      name: 'Wireless Earbuds Pro',
      description: 'Bluetooth 5.3, 24h case battery, noise reduction.',
      sku: 'ELC-EARBUDS',
      price: 4999,
      unit: 'piece',
      reorderLevel: 8,
      type: ProductType.GOODS,
      isActive: true,
      category: electronics,
    },
    {
      name: 'USB-C Cable 2m',
      description: 'Fast charge braided cable.',
      sku: 'ELC-USBC-2M',
      price: 899,
      unit: 'piece',
      reorderLevel: 50,
      type: ProductType.GOODS,
      isActive: true,
      category: electronics,
    },
    {
      name: 'Herbal Shampoo 400ml',
      description: 'Sulfate-free, daily use.',
      sku: 'PC-SHAMPOO-400',
      price: 750,
      unit: 'bottle',
      reorderLevel: 12,
      type: ProductType.GOODS,
      isActive: true,
      category: personalCare,
    },
    {
      name: 'Antibacterial Hand Soap 3-Pack',
      description: 'Family pack, gentle on skin.',
      sku: 'PC-SOAP-3',
      price: 420,
      unit: 'pack',
      reorderLevel: 18,
      type: ProductType.GOODS,
      isActive: true,
      category: personalCare,
    },
    {
      name: 'Gift Wrapping Service',
      description: 'Per-item gift wrap at checkout (in-store).',
      sku: 'SVC-GIFT-WRAP',
      price: 200,
      unit: 'service',
      reorderLevel: 0,
      type: ProductType.SERVICE,
      isActive: true,
      category: personalCare,
    },
    {
      name: 'E-Gift Card PKR 1000',
      description: 'Digital voucher — email delivery.',
      sku: 'DIG-GIFT-1K',
      price: 1000,
      unit: 'card',
      reorderLevel: 0,
      type: ProductType.DIGITAL,
      isActive: true,
      category: electronics,
    },
  ]);

  const bySku = Object.fromEntries(products.map((p) => [p.sku, p]));

  await ds.getRepository(Stock).save([
    { product: bySku['GRC-RICE-5KG'], quantity: 120, location: 'Main Warehouse' },
    { product: bySku['GRC-DAL-1KG'], quantity: 200, location: 'Main Warehouse' },
    { product: bySku['GRC-OIL-1L'], quantity: 45, location: 'Main Warehouse' },
    { product: bySku['GRC-MILK-1L'], quantity: 8, location: 'Cold Store A' },
    { product: bySku['BEV-MANGO-1L'], quantity: 64, location: 'Main Warehouse' },
    { product: bySku['BEV-WATER-6'], quantity: 90, location: 'Main Warehouse' },
    { product: bySku['ELC-EARBUDS'], quantity: 22, location: 'Electronics Bay' },
    { product: bySku['ELC-USBC-2M'], quantity: 150, location: 'Electronics Bay' },
    { product: bySku['PC-SHAMPOO-400'], quantity: 35, location: 'Aisle B' },
    { product: bySku['PC-SOAP-3'], quantity: 5, location: 'Aisle B' },
    { product: bySku['SVC-GIFT-WRAP'], quantity: 999, location: 'Counter' },
    { product: bySku['DIG-GIFT-1K'], quantity: 999, location: 'Digital' },
  ]);

  const supplier = await ds.getRepository(Supplier).save({
    name: 'Metro Wholesale Karachi',
    contactNumber: '03001234567',
    address: 'Industrial Area, Karachi',
  });

  const rice = bySku['GRC-RICE-5KG'];
  const oil = bySku['GRC-OIL-1L'];
  const purchaseItems = [
    { product: rice, quantity: 50, unitPrice: 2100 },
    { product: oil, quantity: 30, unitPrice: 1550 },
  ];
  const purchaseTotal = purchaseItems.reduce(
    (sum, i) => sum + lineTotal(i.quantity, i.unitPrice),
    0,
  );
  await ds.getRepository(Purchase).save({
    supplier,
    totalAmount: purchaseTotal,
    items: purchaseItems.map((i) =>
      ds.getRepository(PurchaseItem).create({
        product: i.product,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      }),
    ),
  });

  const earbuds = bySku['ELC-EARBUDS'];
  await ds.getRepository(Sale).save({
    totalAmount: lineTotal(1, Number(earbuds.price)),
    items: [
      ds.getRepository(SaleItem).create({
        product: earbuds,
        quantity: 1,
        unitPrice: Number(earbuds.price),
      }),
    ],
  });

  await ds.getRepository(Customer).save([
    {
      name: 'Hassan Traders',
      email: 'hassan@traders.demo',
      phone: '03009876543',
      address: 'Saddar, Karachi',
    },
    {
      name: 'Sana Retail',
      email: 'sana@retail.demo',
      phone: '03211234567',
      address: 'Gulberg, Lahore',
    },
  ]);

  const cart = await ds.getRepository(Cart).save({ user: shopper });
  await ds.getRepository(CartItem).save([
    {
      cart,
      product: bySku['ELC-EARBUDS'],
      quantity: 1,
    },
    {
      cart,
      product: bySku['BEV-MANGO-1L'],
      quantity: 2,
    },
  ]);

  const ricePrice = Number(bySku['GRC-RICE-5KG'].price);
  const shampooPrice = Number(bySku['PC-SHAMPOO-400'].price);
  const order1Lines = [
    { product: bySku['GRC-RICE-5KG'], quantity: 2, price: ricePrice },
    { product: bySku['PC-SHAMPOO-400'], quantity: 1, price: shampooPrice },
  ];
  const order1Total = order1Lines.reduce(
    (sum, l) => sum + lineTotal(l.quantity, l.price),
    0,
  );
  const order1 = await ds.getRepository(Order).save({
    user: shopper,
    totalAmount: order1Total.toFixed(2),
    status: OrderStatus.CONFIRMED,
    isPaid: true,
    items: order1Lines.map((l) =>
      ds.getRepository(OrderItem).create({
        product: l.product,
        quantity: l.quantity,
        price: l.price.toFixed(2),
      }),
    ),
  });

  await ds.getRepository(Payment).save({
    order: order1,
    amount: order1.totalAmount,
    method: PaymentMethod.COD,
    status: PaymentStatus.SUCCESS,
    transactionId: 'COD-DEMO-1001',
  });

  const waterPrice = Number(bySku['BEV-WATER-6'].price);
  const cablePrice = Number(bySku['ELC-USBC-2M'].price);
  const order2Lines = [
    { product: bySku['BEV-WATER-6'], quantity: 1, price: waterPrice },
    { product: bySku['ELC-USBC-2M'], quantity: 2, price: cablePrice },
  ];
  const order2Total = order2Lines.reduce(
    (sum, l) => sum + lineTotal(l.quantity, l.price),
    0,
  );
  await ds.getRepository(Order).save({
    user: shopper,
    totalAmount: order2Total.toFixed(2),
    status: OrderStatus.PENDING,
    isPaid: false,
    items: order2Lines.map((l) =>
      ds.getRepository(OrderItem).create({
        product: l.product,
        quantity: l.quantity,
        price: l.price.toFixed(2),
      }),
    ),
  });

  await ds.destroy();

  console.log('\n✅ Zentro shop demo data seeded successfully.\n');
  console.log('Logins (password for all):', DEMO_PASSWORD);
  console.log('  ', DEMO_EMAILS[0], '— active cart + order history');
  console.log('  ', DEMO_EMAILS[1], '— admin role');
  console.log('\nCatalog: 4 categories, 12 products (goods/service/digital), stock, 1 purchase, 1 sale');
  console.log('Shopper: cart (earbuds + 2× mango juice), 1 confirmed/paid order, 1 pending order\n');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

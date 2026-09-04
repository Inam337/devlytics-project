import type { DataSourceOptions } from 'typeorm';
import { Users } from '../entities/user.entity';
import { Category } from '../entities/category.entity';
import { Product } from '../entities/product.entity';
import { Stock } from '../entities/stock.entity';
import { Purchase } from '../entities/purchase.entity';
import { PurchaseItem } from '../entities/purchase.item.entity';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale.item.entity';
import { Supplier } from '../entities/supplier.entity';
import { Customer } from '../entities/customer.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Order } from '../order/entities/order.entity';
import { OrderItem } from '../order-item/entities/order-item.entity';
import { Payment } from '../payment/entities/payment.entity';

export const DatabaseConfigOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'ShopDB',
  entities: [
    Customer,
    Users,
    Category,
    Product,
    Stock,
    Purchase,
    PurchaseItem,
    Sale,
    SaleItem,
    Supplier,
    Cart,
    CartItem,
    Order,
    OrderItem,
    Payment,
  ],
  synchronize: true,
  logging: true,
};

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './category/category.module';
import { CustomersModule } from './customers/customers.module';
import { DatabaseConfigOptions } from './config/database.config';
import { ProductModule } from './product/product.module';
import { PurchaseItemModule } from './purchase-item/purchase.item.module';
import { PurchaseModule } from './purchase/purchase.module';
import { SaleItemModule } from './sale-item/sale.item.module';
import { SaleModule } from './sale/sale.module';
import { StockModule } from './stock/stock.module';
import { SupplierModule } from './supplier/supplier.module';
import { UserModule } from './users/user.module';
import { CartModule } from './cart/cart.module';
import { CartItemModule } from './cart-item/cart-item.module';
import { OrderModule } from './order/order.module';
import { OrderItemModule } from './order-item/order-item.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(DatabaseConfigOptions),
    CustomersModule,
    UserModule,
    AuthModule,
    CategoryModule,
    ProductModule,
    PurchaseModule,
    PurchaseItemModule,
    SaleModule,
    SaleItemModule,
    StockModule,
    SupplierModule,
    CartModule,
    CartItemModule,
    OrderModule,
    OrderItemModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

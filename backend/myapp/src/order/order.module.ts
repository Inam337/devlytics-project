import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from '../order-item/entities/order-item.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { OrderRepository } from './order.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Cart, CartItem]),
    AuthModule,
  ],
  providers: [OrderRepository, OrderService],
  controllers: [OrderController],
  exports: [OrderRepository, OrderService],
})
export class OrderModule {}

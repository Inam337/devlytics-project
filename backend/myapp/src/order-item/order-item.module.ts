import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem } from './entities/order-item.entity';
import { Order } from '../order/entities/order.entity';
import { OrderItemService } from './order-item.service';
import { OrderItemController } from './order-item.controller';
import { OrderItemRepository } from './order-item.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([OrderItem, Order]), AuthModule],
  providers: [OrderItemRepository, OrderItemService],
  controllers: [OrderItemController],
  exports: [OrderItemRepository, OrderItemService],
})
export class OrderItemModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItemService } from './cart-item.service';
import { CartItemController } from './cart-item.controller';
import { CartItemRepository } from './cart-item.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([CartItem, Cart]), AuthModule],
  providers: [CartItemRepository, CartItemService],
  controllers: [CartItemController],
  exports: [CartItemRepository, CartItemService],
})
export class CartItemModule {}

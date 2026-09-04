import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { Cart } from './entities/cart.entity';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUserId() userId: number): Promise<Cart> {
    return this.cartService.getUserCart(userId);
  }

  @Post('items')
  addItem(
    @CurrentUserId() userId: number,
    @Body() dto: AddToCartDto,
  ): Promise<Cart> {
    return this.cartService.addToCart(userId, dto);
  }

  @Delete()
  clear(@CurrentUserId() userId: number): Promise<Cart> {
    return this.cartService.clearCart(userId);
  }
}

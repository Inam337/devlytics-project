import {
  Controller,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CartItemService } from './cart-item.service';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { CartItem } from '../cart/entities/cart-item.entity';

@Controller('cart-items')
@UseGuards(JwtAuthGuard)
export class CartItemController {
  constructor(private readonly cartItemService: CartItemService) {}

  @Patch(':id')
  updateQuantity(
    @CurrentUserId() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartItem> {
    return this.cartItemService.updateQuantity(userId, id, dto);
  }

  @Delete(':id')
  removeItem(
    @CurrentUserId() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.cartItemService.removeItem(userId, id);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { CartItemRepository } from './cart-item.repository';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartItem } from '../cart/entities/cart-item.entity';

@Injectable()
export class CartItemService {
  constructor(private readonly cartItemRepository: CartItemRepository) {}

  async updateQuantity(
    userId: number,
    itemId: number,
    dto: UpdateCartItemDto,
  ): Promise<CartItem> {
    const item = await this.cartItemRepository.findOneForUser(itemId, userId);
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    item.quantity = dto.quantity;
    return this.cartItemRepository.save(item);
  }

  async removeItem(userId: number, itemId: number): Promise<void> {
    const item = await this.cartItemRepository.findOneForUser(itemId, userId);
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    await this.cartItemRepository.remove(item);
  }
}

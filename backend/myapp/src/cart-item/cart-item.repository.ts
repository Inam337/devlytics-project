import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from '../cart/entities/cart-item.entity';

@Injectable()
export class CartItemRepository {
  constructor(
    @InjectRepository(CartItem)
    private readonly repo: Repository<CartItem>,
  ) {}

  create(partial: Partial<CartItem>): CartItem {
    return this.repo.create(partial);
  }

  async save(item: CartItem): Promise<CartItem> {
    return this.repo.save(item);
  }

  async findOneForUser(
    itemId: number,
    userId: number,
  ): Promise<CartItem | null> {
    return this.repo.findOne({
      where: { id: itemId, cart: { user: { id: userId } } },
      relations: ['cart', 'product'],
    });
  }

  async remove(item: CartItem): Promise<CartItem> {
    return this.repo.remove(item);
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';

@Injectable()
export class CartRepository {
  constructor(
    @InjectRepository(Cart)
    private readonly repo: Repository<Cart>,
  ) {}

  create(partial: Partial<Cart>): Cart {
    return this.repo.create(partial);
  }

  async save(cart: Cart): Promise<Cart> {
    return this.repo.save(cart);
  }

  async findByUserIdWithItems(userId: number): Promise<Cart | null> {
    return this.repo.findOne({
      where: { user: { id: userId } },
      relations: ['items', 'items.product', 'items.product.category'],
    });
  }
}

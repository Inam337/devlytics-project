import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from './entities/order-item.entity';

@Injectable()
export class OrderItemRepository {
  constructor(
    @InjectRepository(OrderItem)
    private readonly repo: Repository<OrderItem>,
  ) {}

  async findAllForUser(userId: number): Promise<OrderItem[]> {
    return this.repo.find({
      where: { order: { user: { id: userId } } },
      relations: ['order', 'product'],
      order: { id: 'DESC' },
    });
  }

  async findOneForUser(
    userId: number,
    itemId: number,
  ): Promise<OrderItem | null> {
    return this.repo.findOne({
      where: { id: itemId, order: { user: { id: userId } } },
      relations: ['order', 'product'],
    });
  }
}

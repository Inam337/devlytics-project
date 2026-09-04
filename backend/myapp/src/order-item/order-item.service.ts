import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderItemRepository } from './order-item.repository';
import { OrderItem } from './entities/order-item.entity';

@Injectable()
export class OrderItemService {
  constructor(private readonly orderItemRepository: OrderItemRepository) {}

  findAllForUser(userId: number): Promise<OrderItem[]> {
    return this.orderItemRepository.findAllForUser(userId);
  }

  async findOneForUser(userId: number, itemId: number): Promise<OrderItem> {
    const row = await this.orderItemRepository.findOneForUser(userId, itemId);
    if (!row) {
      throw new NotFoundException('Order line not found');
    }
    return row;
  }
}

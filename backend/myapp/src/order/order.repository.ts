import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';

@Injectable()
export class OrderRepository {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
  ) {}

  create(partial: Partial<Order>): Order {
    return this.repo.create(partial);
  }

  async save(order: Order): Promise<Order> {
    return this.repo.save(order);
  }

  async findForUser(userId: number, orderId: number): Promise<Order | null> {
    return this.repo.findOne({
      where: { id: orderId, user: { id: userId } },
      relations: ['items', 'items.product'],
    });
  }

  async listForUser(userId: number): Promise<Order[]> {
    return this.repo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      relations: ['items', 'items.product'],
    });
  }

  async remove(order: Order): Promise<Order> {
    return this.repo.remove(order);
  }
}

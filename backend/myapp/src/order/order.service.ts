import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from '../order-item/entities/order-item.entity';
import { OrderStatus } from '../entities/order-status.enum';
import { Users } from '../entities/user.entity';
import { OrderRepository } from './order.repository';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrderService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orderRepository: OrderRepository,
  ) {}

  async createOrder(userId: number): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const cartRepo = manager.getRepository(Cart);
      const cartItemRepo = manager.getRepository(CartItem);
      const orderRepo = manager.getRepository(Order);
      const orderItemRepo = manager.getRepository(OrderItem);

      const cart = await cartRepo.findOne({
        where: { user: { id: userId } },
        relations: ['items', 'items.product'],
      });

      if (!cart?.items?.length) {
        throw new BadRequestException('Cart is empty');
      }

      let total = 0;
      const orderItems: OrderItem[] = [];

      for (const line of cart.items) {
        const product = line.product;
        if (!product?.isActive) {
          throw new BadRequestException(
            `Product ${product?.id ?? '?'} is not available`,
          );
        }
        const unitPrice = Number(product.price);
        if (Number.isNaN(unitPrice)) {
          throw new BadRequestException('Invalid product price');
        }
        const lineTotal = unitPrice * line.quantity;
        total += lineTotal;

        orderItems.push(
          orderItemRepo.create({
            product,
            quantity: line.quantity,
            price: unitPrice.toFixed(2),
          }),
        );
      }

      const order = orderRepo.create({
        user: { id: userId } as Users,
        totalAmount: total.toFixed(2),
        status: OrderStatus.PENDING,
      });
      const saved = await orderRepo.save(order);

      for (const line of orderItems) {
        line.order = saved;
      }
      await orderItemRepo.save(orderItems);

      await cartItemRepo.delete({ cart: { id: cart.id } });

      return orderRepo.findOneOrFail({
        where: { id: saved.id },
        relations: ['items', 'items.product'],
      });
    });
  }

  async findAllForUser(userId: number): Promise<Order[]> {
    return this.orderRepository.listForUser(userId);
  }

  async findOneForUser(userId: number, orderId: number): Promise<Order> {
    const order = await this.orderRepository.findForUser(userId, orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    return order;
  }

  async updateStatusForUser(
    userId: number,
    orderId: number,
    dto: UpdateOrderStatusDto,
  ): Promise<Order> {
    const order = await this.findOneForUser(userId, orderId);
    order.status = dto.status;
    await this.orderRepository.save(order);
    return this.findOneForUser(userId, orderId);
  }

  async removeForUser(userId: number, orderId: number): Promise<void> {
    const order = await this.findOneForUser(userId, orderId);
    await this.orderRepository.remove(order);
  }
}

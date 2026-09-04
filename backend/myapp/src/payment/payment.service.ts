import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../order/entities/order.entity';
import { Payment } from './entities/payment.entity';
import { PaymentRepository } from './payment.repository';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentStatus } from './enums/payment-status.enum';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async createForUser(
    userId: number,
    dto: CreatePaymentDto,
  ): Promise<Payment> {
    const order = await this.orderRepo.findOne({
      where: { id: dto.orderId, user: { id: userId } },
      relations: ['user'],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.isPaid) {
      throw new BadRequestException('Order is already paid');
    }

    const payment = this.paymentRepository.create({
      order,
      amount: order.totalAmount,
      method: dto.method,
      status: PaymentStatus.PENDING,
    });

    return this.paymentRepository.save(payment);
  }

  async findAllForUser(userId: number): Promise<Payment[]> {
    return this.paymentRepository.findAllForUser(userId);
  }

  async findOneForUser(userId: number, paymentId: number): Promise<Payment> {
    const payment = await this.paymentRepository.findOneForUser(
      userId,
      paymentId,
    );
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async updateStatusForUser(
    userId: number,
    paymentId: number,
    dto: UpdatePaymentStatusDto,
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findByIdWithOrderUser(
      paymentId,
    );
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.order.user.id !== userId) {
      throw new ForbiddenException('You cannot update this payment');
    }

    payment.status = dto.status;
    if (dto.transactionId !== undefined) {
      payment.transactionId = dto.transactionId ?? null;
    }

    if (dto.status === PaymentStatus.SUCCESS) {
      const order = await this.orderRepo.findOne({
        where: { id: payment.order.id },
      });
      if (order) {
        order.isPaid = true;
        await this.orderRepo.save(order);
      }
    }

    return this.paymentRepository.save(payment);
  }

  async removeForUser(userId: number, paymentId: number): Promise<void> {
    const payment = await this.findOneForUser(userId, paymentId);
    await this.paymentRepository.remove(payment);
  }
}

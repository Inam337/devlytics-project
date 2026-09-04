import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Order } from '../order/entities/order.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentRepository } from './payment.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Order]), AuthModule],
  providers: [PaymentRepository, PaymentService],
  controllers: [PaymentController],
  exports: [PaymentRepository, PaymentService, TypeOrmModule],
})
export class PaymentModule {}

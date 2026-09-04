import {
  Controller,
  Post,
  Body,
  Put,
  Param,
  ParseIntPipe,
  UseGuards,
  Get,
  Delete,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { Payment } from './entities/payment.entity';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  create(
    @CurrentUserId() userId: number,
    @Body() body: CreatePaymentDto,
  ): Promise<Payment> {
    return this.paymentService.createForUser(userId, body);
  }

  @Get()
  findAll(@CurrentUserId() userId: number): Promise<Payment[]> {
    return this.paymentService.findAllForUser(userId);
  }

  @Get(':id')
  findOne(
    @CurrentUserId() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Payment> {
    return this.paymentService.findOneForUser(userId, id);
  }

  @Put(':id/status')
  updateStatus(
    @CurrentUserId() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePaymentStatusDto,
  ): Promise<Payment> {
    return this.paymentService.updateStatusForUser(userId, id, body);
  }

  @Delete(':id')
  remove(
    @CurrentUserId() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.paymentService.removeForUser(userId, id);
  }
}

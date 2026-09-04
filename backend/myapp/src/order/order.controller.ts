import {
  Controller,
  Post,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
  Put,
  Body,
  Delete,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { Order } from './entities/order.entity';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('checkout')
  checkout(@CurrentUserId() userId: number): Promise<Order> {
    return this.orderService.createOrder(userId);
  }

  @Get()
  findAll(@CurrentUserId() userId: number): Promise<Order[]> {
    return this.orderService.findAllForUser(userId);
  }

  @Get(':id')
  findOne(
    @CurrentUserId() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Order> {
    return this.orderService.findOneForUser(userId, id);
  }

  @Put(':id/status')
  updateStatus(
    @CurrentUserId() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateOrderStatusDto,
  ): Promise<Order> {
    return this.orderService.updateStatusForUser(userId, id, body);
  }

  @Delete(':id')
  remove(
    @CurrentUserId() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.orderService.removeForUser(userId, id);
  }
}

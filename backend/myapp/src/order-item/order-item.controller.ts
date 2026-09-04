import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { OrderItemService } from './order-item.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { OrderItem } from './entities/order-item.entity';

@Controller('order-items')
@UseGuards(JwtAuthGuard)
export class OrderItemController {
  constructor(private readonly orderItemService: OrderItemService) {}

  @Get()
  findAll(@CurrentUserId() userId: number): Promise<OrderItem[]> {
    return this.orderItemService.findAllForUser(userId);
  }

  @Get(':id')
  findOne(
    @CurrentUserId() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OrderItem> {
    return this.orderItemService.findOneForUser(userId, id);
  }
}

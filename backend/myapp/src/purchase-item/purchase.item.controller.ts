import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { PurchaseItemService } from './purchase.item.service';
import { PurchaseItem } from '../entities/purchase.item.entity';
import { CreatePurchaseItemDto } from './dto/create-purchase-item.dto';
import { UpdatePurchaseItemDto } from './dto/update-purchase-item.dto';

@Controller('purchase-items')
export class PurchaseItemController {
  constructor(private readonly purchaseItemService: PurchaseItemService) {}

  @Post()
  create(@Body() body: CreatePurchaseItemDto): Promise<PurchaseItem> {
    return this.purchaseItemService.create(body);
  }

  @Get()
  findAll(): Promise<PurchaseItem[]> {
    return this.purchaseItemService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<PurchaseItem> {
    return this.purchaseItemService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePurchaseItemDto,
  ): Promise<PurchaseItem> {
    return this.purchaseItemService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.purchaseItemService.remove(id);
  }
}

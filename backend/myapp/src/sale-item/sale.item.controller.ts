import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { SaleItemService } from './sale.item.service';
import { SaleItem } from '../entities/sale.item.entity';
import { CreateSaleItemDto } from './dto/create-sale-item.dto';
import { UpdateSaleItemDto } from './dto/update-sale-item.dto';

@Controller('sale-items')
export class SaleItemController {
  constructor(private readonly saleItemService: SaleItemService) {}

  @Post()
  create(@Body() body: CreateSaleItemDto): Promise<SaleItem> {
    return this.saleItemService.create(body);
  }

  @Get()
  findAll(): Promise<SaleItem[]> {
    return this.saleItemService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<SaleItem> {
    return this.saleItemService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateSaleItemDto,
  ): Promise<SaleItem> {
    return this.saleItemService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.saleItemService.remove(id);
  }
}

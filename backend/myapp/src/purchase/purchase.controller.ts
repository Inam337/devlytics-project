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
import { PurchaseService } from './purchase.service';
import { Purchase } from '../entities/purchase.entity';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';

@Controller('purchases')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post()
  create(@Body() body: CreatePurchaseDto): Promise<Purchase> {
    return this.purchaseService.create(body);
  }

  @Get()
  findAll(): Promise<Purchase[]> {
    return this.purchaseService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Purchase> {
    return this.purchaseService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePurchaseDto,
  ): Promise<Purchase> {
    return this.purchaseService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.purchaseService.remove(id);
  }
}

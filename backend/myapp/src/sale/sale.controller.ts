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
import { SaleService } from './sale.service';
import { Sale } from '../entities/sale.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';

@Controller('sales')
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @Post()
  create(@Body() body: CreateSaleDto): Promise<Sale> {
    return this.saleService.create(body);
  }

  @Get()
  findAll(): Promise<Sale[]> {
    return this.saleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Sale> {
    return this.saleService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateSaleDto,
  ): Promise<Sale> {
    return this.saleService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.saleService.remove(id);
  }
}

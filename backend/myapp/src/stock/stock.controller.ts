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
import { StockService } from './stock.service';
import { Stock } from '../entities/stock.entity';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@Controller('stocks')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post()
  create(@Body() body: CreateStockDto): Promise<Stock> {
    return this.stockService.create(body);
  }

  @Get()
  findAll(): Promise<Stock[]> {
    return this.stockService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Stock> {
    return this.stockService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateStockDto,
  ): Promise<Stock> {
    return this.stockService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.stockService.remove(id);
  }
}

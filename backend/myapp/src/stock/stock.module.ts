import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../entities/product.entity';
import { Stock } from '../entities/stock.entity';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { StockRepository } from './stock.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Stock, Product])],
  providers: [StockRepository, StockService],
  controllers: [StockController],
  exports: [StockRepository, TypeOrmModule],
})
export class StockModule {}

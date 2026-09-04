import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale.item.entity';
import { Product } from '../entities/product.entity';
import { SaleService } from './sale.service';
import { SaleController } from './sale.controller';
import { SaleRepository } from './sale.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, SaleItem, Product])],
  controllers: [SaleController],
  providers: [SaleRepository, SaleService],
  exports: [SaleRepository, TypeOrmModule],
})
export class SaleModule {}

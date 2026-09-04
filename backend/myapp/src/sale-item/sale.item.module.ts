import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../entities/product.entity';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale.item.entity';
import { SaleItemService } from './sale.item.service';
import { SaleItemController } from './sale.item.controller';
import { SaleItemRepository } from './sale.item.repository';

@Module({
  imports: [TypeOrmModule.forFeature([SaleItem, Sale, Product])],
  providers: [SaleItemRepository, SaleItemService],
  controllers: [SaleItemController],
  exports: [SaleItemRepository, TypeOrmModule],
})
export class SaleItemModule {}

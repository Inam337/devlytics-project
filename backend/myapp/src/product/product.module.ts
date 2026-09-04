import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../entities/product.entity';
import { Category } from '../entities/category.entity';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductRepository } from './product.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category])],
  providers: [ProductRepository, ProductService],
  controllers: [ProductController],
  exports: [ProductRepository, TypeOrmModule],
})
export class ProductModule {}

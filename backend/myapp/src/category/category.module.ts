import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../entities/category.entity';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { CategoryRepository } from './category.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  providers: [CategoryRepository, CategoryService],
  controllers: [CategoryController],
  exports: [CategoryRepository, TypeOrmModule],
})
export class CategoryModule {}

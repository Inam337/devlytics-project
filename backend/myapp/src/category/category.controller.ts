import {
  Controller,
  Get,
  Put,
  Delete,
  Post,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { Category } from '../entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  findAll(): Promise<Category[]> {
    return this.categoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Category> {
    return this.categoryService.findOne(id);
  }

  @Post()
  create(@Body() body: CreateCategoryDto): Promise<Category> {
    return this.categoryService.create(body);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoryService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.categoryService.remove(id);
  }
}

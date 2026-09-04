import { Injectable, NotFoundException } from '@nestjs/common';
import { Category } from '../entities/category.entity';
import { CategoryRepository } from './category.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  findAll(): Promise<Category[]> {
    return this.categoryRepository.findAllWithRelations();
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository.findByIdWithRelations(id);
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    return category;
  }

  create(dto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepository.create({
      name: dto.name,
      description: dto.description,
    });
    return this.categoryRepository.save(category);
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<Category> {
    const existing = await this.findOne(id);
    return this.categoryRepository.mergeAndSave(existing, dto);
  }

  async remove(id: number): Promise<void> {
    const category = await this.findOne(id);
    await this.categoryRepository.remove(category);
  }
}

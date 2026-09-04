import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, Repository } from 'typeorm';
import { Category } from '../entities/category.entity';

const DEFAULT_RELATIONS: FindOptionsRelations<Category> = {
  products: true,
};

@Injectable()
export class CategoryRepository {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  create(partial: Partial<Category>): Category {
    return this.repo.create(partial);
  }

  async save(category: Category): Promise<Category> {
    return this.repo.save(category);
  }

  async findAllWithRelations(): Promise<Category[]> {
    return this.repo.find({
      relations: DEFAULT_RELATIONS,
      order: { id: 'ASC' },
    });
  }

  async findByIdWithRelations(id: number): Promise<Category | null> {
    return this.repo.findOne({
      where: { id },
      relations: DEFAULT_RELATIONS,
    });
  }

  async mergeAndSave(
    existing: Category,
    partial: Partial<Category>,
  ): Promise<Category> {
    return this.repo.save(this.repo.merge(existing, partial));
  }

  async remove(category: Category): Promise<Category> {
    return this.repo.remove(category);
  }
}

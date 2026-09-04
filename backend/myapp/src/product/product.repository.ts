import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsRelations, Repository } from 'typeorm';
import { Product } from '../entities/product.entity';

const DEFAULT_RELATIONS: FindOptionsRelations<Product> = {
  category: true,
  stockEntries: true,
};

@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  create(partial: Partial<Product>): Product {
    return this.repo.create(partial);
  }

  async save(entity: Product): Promise<Product> {
    return this.repo.save(entity);
  }

  async findAllActiveWithRelations(): Promise<Product[]> {
    return this.repo.find({
      where: { isActive: true },
      relations: DEFAULT_RELATIONS,
      order: { id: 'ASC' },
    });
  }

  async findByIdWithRelations(id: number): Promise<Product | null> {
    return this.repo.findOne({
      where: { id },
      relations: DEFAULT_RELATIONS,
    });
  }

  async findActiveByIdWithRelations(id: number): Promise<Product | null> {
    return this.repo.findOne({
      where: { id, isActive: true },
      relations: DEFAULT_RELATIONS,
    });
  }

  async mergeAndSave(
    existing: Product,
    partial: Partial<Product>,
  ): Promise<Product> {
    return this.repo.save(this.repo.merge(existing, partial));
  }
}

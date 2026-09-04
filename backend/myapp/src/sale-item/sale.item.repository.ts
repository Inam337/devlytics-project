import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, Repository } from 'typeorm';
import { SaleItem } from '../entities/sale.item.entity';

const DEFAULT_RELATIONS: FindOptionsRelations<SaleItem> = {
  sale: true,
  product: true,
};

@Injectable()
export class SaleItemRepository {
  constructor(
    @InjectRepository(SaleItem)
    private readonly repo: Repository<SaleItem>,
  ) {}

  create(partial: Partial<SaleItem>): SaleItem {
    return this.repo.create(partial);
  }

  async save(item: SaleItem): Promise<SaleItem> {
    return this.repo.save(item);
  }

  async findAllWithRelations(): Promise<SaleItem[]> {
    return this.repo.find({
      relations: DEFAULT_RELATIONS,
      order: { id: 'ASC' },
    });
  }

  async findByIdWithRelations(id: number): Promise<SaleItem | null> {
    return this.repo.findOne({
      where: { id },
      relations: DEFAULT_RELATIONS,
    });
  }

  async mergeAndSave(
    existing: SaleItem,
    partial: Partial<SaleItem>,
  ): Promise<SaleItem> {
    return this.repo.save(this.repo.merge(existing, partial));
  }

  async remove(item: SaleItem): Promise<SaleItem> {
    return this.repo.remove(item);
  }
}

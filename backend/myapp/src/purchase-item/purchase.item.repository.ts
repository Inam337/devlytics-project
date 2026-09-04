import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, Repository } from 'typeorm';
import { PurchaseItem } from '../entities/purchase.item.entity';

const DEFAULT_RELATIONS: FindOptionsRelations<PurchaseItem> = {
  purchase: true,
  product: true,
};

@Injectable()
export class PurchaseItemRepository {
  constructor(
    @InjectRepository(PurchaseItem)
    private readonly repo: Repository<PurchaseItem>,
  ) {}

  create(partial: Partial<PurchaseItem>): PurchaseItem {
    return this.repo.create(partial);
  }

  async save(item: PurchaseItem): Promise<PurchaseItem> {
    return this.repo.save(item);
  }

  async findAllWithRelations(): Promise<PurchaseItem[]> {
    return this.repo.find({
      relations: DEFAULT_RELATIONS,
      order: { id: 'ASC' },
    });
  }

  async findByIdWithRelations(id: number): Promise<PurchaseItem | null> {
    return this.repo.findOne({
      where: { id },
      relations: DEFAULT_RELATIONS,
    });
  }

  async mergeAndSave(
    existing: PurchaseItem,
    partial: Partial<PurchaseItem>,
  ): Promise<PurchaseItem> {
    return this.repo.save(this.repo.merge(existing, partial));
  }

  async remove(item: PurchaseItem): Promise<PurchaseItem> {
    return this.repo.remove(item);
  }
}

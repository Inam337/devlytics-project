import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, Repository } from 'typeorm';
import { Purchase } from '../entities/purchase.entity';

const DEFAULT_RELATIONS: FindOptionsRelations<Purchase> = {
  supplier: true,
  items: {
    product: true,
  },
};

@Injectable()
export class PurchaseRepository {
  constructor(
    @InjectRepository(Purchase)
    private readonly repo: Repository<Purchase>,
  ) {}

  create(partial: Partial<Purchase>): Purchase {
    return this.repo.create(partial);
  }

  async save(purchase: Purchase): Promise<Purchase> {
    return this.repo.save(purchase);
  }

  async findAllWithRelations(): Promise<Purchase[]> {
    return this.repo.find({
      relations: DEFAULT_RELATIONS,
      order: { id: 'DESC' },
    });
  }

  async findByIdWithRelations(id: number): Promise<Purchase | null> {
    return this.repo.findOne({
      where: { id },
      relations: DEFAULT_RELATIONS,
    });
  }

  async remove(purchase: Purchase): Promise<Purchase> {
    return this.repo.remove(purchase);
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, Repository } from 'typeorm';
import { Sale } from '../entities/sale.entity';

const DEFAULT_RELATIONS: FindOptionsRelations<Sale> = {
  items: {
    product: true,
  },
};

@Injectable()
export class SaleRepository {
  constructor(
    @InjectRepository(Sale)
    private readonly repo: Repository<Sale>,
  ) {}

  create(partial: Partial<Sale>): Sale {
    return this.repo.create(partial);
  }

  async save(sale: Sale): Promise<Sale> {
    return this.repo.save(sale);
  }

  async findAllWithRelations(): Promise<Sale[]> {
    return this.repo.find({
      relations: DEFAULT_RELATIONS,
      order: { id: 'DESC' },
    });
  }

  async findByIdWithRelations(id: number): Promise<Sale | null> {
    return this.repo.findOne({
      where: { id },
      relations: DEFAULT_RELATIONS,
    });
  }

  async remove(sale: Sale): Promise<Sale> {
    return this.repo.remove(sale);
  }
}

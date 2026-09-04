import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, Repository } from 'typeorm';
import { Stock } from '../entities/stock.entity';

const DEFAULT_RELATIONS: FindOptionsRelations<Stock> = {
  product: true,
};

@Injectable()
export class StockRepository {
  constructor(
    @InjectRepository(Stock)
    private readonly repo: Repository<Stock>,
  ) {}

  create(partial: Partial<Stock>): Stock {
    return this.repo.create(partial);
  }

  async save(stock: Stock): Promise<Stock> {
    return this.repo.save(stock);
  }

  async findAllWithRelations(): Promise<Stock[]> {
    return this.repo.find({
      relations: DEFAULT_RELATIONS,
      order: { id: 'ASC' },
    });
  }

  async findByIdWithRelations(id: number): Promise<Stock | null> {
    return this.repo.findOne({
      where: { id },
      relations: DEFAULT_RELATIONS,
    });
  }

  async mergeAndSave(existing: Stock, partial: Partial<Stock>): Promise<Stock> {
    return this.repo.save(this.repo.merge(existing, partial));
  }

  async remove(stock: Stock): Promise<Stock> {
    return this.repo.remove(stock);
  }
}

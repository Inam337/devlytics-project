import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, Repository } from 'typeorm';
import { Supplier } from '../entities/supplier.entity';

const DEFAULT_RELATIONS: FindOptionsRelations<Supplier> = {
  purchases: true,
};

@Injectable()
export class SupplierRepository {
  constructor(
    @InjectRepository(Supplier)
    private readonly repo: Repository<Supplier>,
  ) {}

  create(partial: Partial<Supplier>): Supplier {
    return this.repo.create(partial);
  }

  async save(supplier: Supplier): Promise<Supplier> {
    return this.repo.save(supplier);
  }

  async findAllWithRelations(): Promise<Supplier[]> {
    return this.repo.find({
      relations: DEFAULT_RELATIONS,
      order: { id: 'ASC' },
    });
  }

  async findByIdWithRelations(id: number): Promise<Supplier | null> {
    return this.repo.findOne({
      where: { id },
      relations: DEFAULT_RELATIONS,
    });
  }

  async mergeAndSave(
    existing: Supplier,
    partial: Partial<Supplier>,
  ): Promise<Supplier> {
    return this.repo.save(this.repo.merge(existing, partial));
  }

  async remove(supplier: Supplier): Promise<Supplier> {
    return this.repo.remove(supplier);
  }
}

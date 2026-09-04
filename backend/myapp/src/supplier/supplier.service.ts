import { Injectable, NotFoundException } from '@nestjs/common';
import { Supplier } from '../entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierRepository } from './supplier.repository';

@Injectable()
export class SupplierService {
  constructor(private readonly supplierRepository: SupplierRepository) {}

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    const supplier = this.supplierRepository.create(dto);
    return this.supplierRepository.save(supplier);
  }

  findAll(): Promise<Supplier[]> {
    return this.supplierRepository.findAllWithRelations();
  }

  async findOne(id: number): Promise<Supplier> {
    const supplier = await this.supplierRepository.findByIdWithRelations(id);
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async update(id: number, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(id);
    return this.supplierRepository.mergeAndSave(supplier, dto);
  }

  async remove(id: number): Promise<void> {
    const supplier = await this.findOne(id);
    await this.supplierRepository.remove(supplier);
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../entities/customer.entity';

@Injectable()
export class CustomersRepository {
  constructor(
    @InjectRepository(Customer)
    private readonly repo: Repository<Customer>,
  ) {}

  create(partial: Partial<Customer>): Customer {
    return this.repo.create(partial);
  }

  async save(customer: Customer): Promise<Customer> {
    return this.repo.save(customer);
  }

  async findAll(): Promise<Customer[]> {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async findById(id: number): Promise<Customer | null> {
    return this.repo.findOne({ where: { id } });
  }

  async mergeAndSave(
    existing: Customer,
    partial: Partial<Customer>,
  ): Promise<Customer> {
    return this.repo.save(this.repo.merge(existing, partial));
  }

  async remove(customer: Customer): Promise<Customer> {
    return this.repo.remove(customer);
  }
}

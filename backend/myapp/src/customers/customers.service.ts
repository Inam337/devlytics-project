import { Injectable, NotFoundException } from '@nestjs/common';
import { Customer } from '../entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersRepository } from './customers.repository';

@Injectable()
export class CustomersService {
  constructor(private readonly customersRepository: CustomersRepository) {}

  create(dto: CreateCustomerDto): Promise<Customer> {
    const customer = this.customersRepository.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
    });
    return this.customersRepository.save(customer);
  }

  findAll(): Promise<Customer[]> {
    return this.customersRepository.findAll();
  }

  async findOne(id: number): Promise<Customer> {
    const customer = await this.customersRepository.findById(id);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async update(id: number, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id);
    return this.customersRepository.mergeAndSave(customer, dto);
  }

  async remove(id: number): Promise<void> {
    const customer = await this.findOne(id);
    await this.customersRepository.remove(customer);
  }
}

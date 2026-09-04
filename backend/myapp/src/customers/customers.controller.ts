import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { Customer } from '../entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@Body() createCustomerDto: CreateCustomerDto): Promise<Customer> {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  findAll(): Promise<Customer[]> {
    return this.customersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Customer> {
    return this.customersService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer> {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.customersService.remove(id);
  }
}

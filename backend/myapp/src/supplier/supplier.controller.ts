import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { Supplier } from '../entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Controller('suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  create(@Body() body: CreateSupplierDto): Promise<Supplier> {
    return this.supplierService.create(body);
  }

  @Get()
  findAll(): Promise<Supplier[]> {
    return this.supplierService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Supplier> {
    return this.supplierService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateSupplierDto,
  ): Promise<Supplier> {
    return this.supplierService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.supplierService.remove(id);
  }
}

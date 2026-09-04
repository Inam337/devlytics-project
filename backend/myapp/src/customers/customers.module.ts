import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { Customer } from '../entities/customer.entity';
import { CustomersRepository } from './customers.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Customer])],
  controllers: [CustomersController],
  providers: [CustomersRepository, CustomersService],
  exports: [CustomersRepository, TypeOrmModule],
})
export class CustomersModule {}

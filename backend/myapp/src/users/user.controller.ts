import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { UserService } from './user.service';
import { Users } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll() {
    return await this.userService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.userService.findOne(Number(id));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.userService.create(createUserDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateUserDto>,
  ) {
    return await this.userService.update(Number(id), updateData);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return await this.userService.delete(Number(id));
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateUserStatusDto,
  ) {
    return await this.userService.updateStatus(Number(id), updateStatusDto);
  }
}

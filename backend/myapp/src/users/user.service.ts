import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class UserService {
  constructor(@InjectRepository(Users) private userRepo: Repository<Users>) {}

  async findAll() {
    return await this.userRepo.find({
      select: [
        'id',
        'name',
        'email',
        'role',
        'status',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  async findOne(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      select: [
        'id',
        'name',
        'email',
        'role',
        'status',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async create(userDto: CreateUserDto) {
    const existing = await this.userRepo.findOne({
      where: { email: userDto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const newUser = this.userRepo.create(userDto);
    const savedUser = await this.userRepo.save(newUser);

    // Remove password from response
    const { password, ...result } = savedUser;
    return result;
  }

  async update(id: number, data: Partial<Users>) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Don't allow updating timestamps directly
    delete data.createdAt;
    delete data.updatedAt;

    Object.assign(user, data);
    const updated = await this.userRepo.save(user);

    // Remove password from response
    const { password, ...result } = updated;
    return result;
  }

  async delete(id: number) {
    const result = await this.userRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
    return { message: 'User deleted successfully' };
  }

  async updateStatus(id: number, statusData: UpdateUserStatusDto) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update the status property based on isActive value
    user.status = statusData.isActive;
    const updated = await this.userRepo.save(user);

    // Map to our API response format
    const { password, ...result } = updated;
    return {
      ...result,
      isActive: result.status, // Map status to isActive for frontend compatibility
    };
  }
}

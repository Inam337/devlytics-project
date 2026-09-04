import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from '../entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Users) private userRepo: Repository<Users>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  private generateTokens(userId: number, email: string) {
    const accessExpires = (this.configService.get<string>('JWT_EXPIRES_IN') ??
      '1h') as SignOptions['expiresIn'];
    const refreshExpires = (this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
    ) ?? '7d') as SignOptions['expiresIn'];

    const accessToken = this.jwtService.sign(
      {
        userId,
        email,
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: accessExpires,
      },
    );

    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET')
      ?? this.configService.get<string>('JWT_SECRET');

    if (!refreshSecret) {
      throw new InternalServerErrorException(
        'JWT_REFRESH_SECRET (or JWT_SECRET) is not configured',
      );
    }

    const refreshToken = this.jwtService.sign(
      {
        userId,
        email,
        isRefreshToken: true,
      },
      {
        secret: refreshSecret,
        expiresIn: refreshExpires,
      },
    );

    return { accessToken, refreshToken };
  }

  async register(name: string, email: string, password: string) {
    try {
      console.log('Starting registration process for:', email);

      // Check for existing user
      const existing = await this.userRepo.findOne({ where: { email } });
      if (existing) {
        console.log('Email already exists:', email);
        throw new ConflictException('Email already registered');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);
      console.log('Password hashed successfully');

      // Create user entity
      const user = this.userRepo.create({
        name,
        email,
        password: hashedPassword,
        role: 'user',
        status: true,
      });
      console.log('User entity created:', { name, email });

      // Save user to database
      const savedUser = await this.userRepo.save(user);
      console.log('User saved successfully:', {
        id: savedUser.id,
        email: savedUser.email,
      });

      // Generate JWT tokens
      const { accessToken, refreshToken } = this.generateTokens(
        savedUser.id,
        savedUser.email,
      );

      return {
        success: true,
        message: 'User registered successfully',
        user: {
          id: savedUser.id,
          name: savedUser.name,
          email: savedUser.email,
          role: savedUser.role,
        },
        token: accessToken,
        refreshToken,
      };
    } catch (error) {
      console.error('Error in register service:', error);
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to register user');
    }
  }

  async login(email: string, password: string) {
    try {
      console.log('Login attempt for email:', email);

      // Find user by email and explicitly select all needed fields including status
      const user = await this.userRepo.findOne({
        where: { email },
        select: ['id', 'email', 'name', 'password', 'role', 'status'],
      });

      if (!user) {
        console.log('User not found with email:', email);
        throw new UnauthorizedException('Invalid email or password');
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log('Password mismatch for user:', email);
        throw new UnauthorizedException('Invalid email or password');
      }

      // Check if user is inactive
      if (user.status === false) {
        console.log('Login attempt by inactive user:', email);
        throw new UnauthorizedException(
          'User is inactive. Please contact administrator to activate your account.',
        );
      }

      // Generate JWT tokens
      const { accessToken, refreshToken } = this.generateTokens(
        user.id,
        user.email,
      );

      console.log('Login successful for user:', email);
      return {
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'user',
          status: user.status,
        },
        token: accessToken,
        refreshToken,
      };
    } catch (error) {
      console.error('Error in login service:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const refreshSecret =
        this.configService.get<string>('JWT_REFRESH_SECRET')
        ?? this.configService.get<string>('JWT_SECRET');

      if (!refreshSecret) {
        throw new UnauthorizedException('Refresh token is not configured');
      }

      const payload = this.jwtService.verify(refreshToken, {
        secret: refreshSecret,
      });

      // Check if it's a refresh token
      if (!payload.isRefreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get user
      const user = await this.userRepo.findOne({
        where: {
          id: payload.userId,
          email: payload.email,
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Generate new tokens
      const tokens = this.generateTokens(user.id, user.email);

      return {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      console.error('Error in refreshToken service:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    try {
      console.log('Change password attempt for user ID:', userId);

      // Find user by ID
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        console.log('User not found with ID:', userId);
        throw new NotFoundException('User not found');
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        console.log('Current password mismatch for user ID:', userId);
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update user password
      user.password = hashedPassword;
      await this.userRepo.save(user);

      console.log('Password changed successfully for user ID:', userId);
      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      console.error('Error in changePassword service:', error);
      throw error;
    }
  }
}

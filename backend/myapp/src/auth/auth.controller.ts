import {
  Body,
  Controller,
  Post,
  HttpException,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

interface LoginDto {
  email: string;
  password: string;
}

interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerData: RegisterDto) {
    try {
      console.log('Register request received for:', registerData.email);

      const result = await this.authService.register(
        registerData.name,
        registerData.email,
        registerData.password,
      );

      console.log('Registration successful for:', registerData.email);
      return result;
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Registration failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('login')
  async login(@Body() loginData: LoginDto) {
    try {
      console.log('Login request received for:', loginData.email);
      const result = await this.authService.login(
        loginData.email,
        loginData.password,
      );
      console.log('Login successful for:', loginData.email);
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw new HttpException(
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @Post('refresh-token')
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    try {
      if (!refreshToken) {
        throw new HttpException(
          'Refresh token is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.authService.refreshToken(refreshToken);
      return result;
    } catch (error) {
      console.error('Refresh token error:', error);
      throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Request() req,
    @Body() changePasswordData: ChangePasswordDto,
  ) {
    try {
      console.log(
        'Change password request received for user ID:',
        req.user.userId,
      );

      const result = await this.authService.changePassword(
        req.user.userId,
        changePasswordData.currentPassword,
        changePasswordData.newPassword,
      );

      console.log('Password change successful for user ID:', req.user.userId);
      return result;
    } catch (error) {
      console.error('Change password error:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Password change failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

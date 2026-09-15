import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  Client,
  ClientInfo,
  CurrentUser,
  OrganizationId,
  Public,
  ResponseMessage,
} from '../common/decorators';
import { AuthService } from './auth.service';
import {
  AcceptInvitationDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ResponseMessage('Organization and administrator account created successfully')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register an organization and its first Organization Admin' })
  @ApiResponse({ status: 201, description: 'Session issued for the new administrator' })
  @ApiResponse({ status: 409, description: 'An account already exists for this email' })
  register(@Body() dto: RegisterDto, @Client() client: ClientInfo) {
    return this.authService.register(dto, client);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Signed in successfully')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  login(@Body() dto: LoginDto, @Client() client: ClientInfo) {
    return this.authService.login(dto, client);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Session refreshed successfully')
  @ApiOperation({ summary: 'Exchange a refresh token for a new pair (rotating the old one)' })
  refresh(@Body() dto: RefreshTokenDto, @Client() client: ClientInfo) {
    return this.authService.refresh(dto, client);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ResponseMessage('Signed out successfully')
  @ApiOperation({ summary: 'Revoke the presented refresh token, or every session when omitted' })
  logout(
    @Body() dto: Partial<RefreshTokenDto>,
    @CurrentUser('userId') userId: string,
    @OrganizationId() organizationId: string,
  ) {
    return this.authService.logout(dto?.refreshToken, userId, organizationId);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The signed-in identity, organization, role and permission scope' })
  me(@OrganizationId() organizationId: string, @CurrentUser('userId') userId: string) {
    return this.authService.me(organizationId, userId);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('If the account exists, a reset link has been sent')
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @ApiOperation({ summary: 'Request a single-use password reset link (30-minute expiry)' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Password reset successfully')
  @ApiOperation({ summary: 'Complete a password reset with the emailed token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ResponseMessage('Password changed successfully')
  @ApiOperation({ summary: 'Change your own password (revokes every existing session)' })
  changePassword(
    @OrganizationId() organizationId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: ChangePasswordDto,
    @Client() client: ClientInfo,
  ) {
    return this.authService.changePassword(organizationId, userId, dto, client);
  }

  @Public()
  @Post('accept-invitation')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Invitation accepted successfully')
  @ApiOperation({ summary: 'Set the first password for an invited member and activate membership' })
  acceptInvitation(@Body() dto: AcceptInvitationDto, @Client() client: ClientInfo) {
    return this.authService.acceptInvitation(dto, client);
  }
}

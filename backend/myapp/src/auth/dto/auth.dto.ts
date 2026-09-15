import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateOrganizationDto } from '../../organizations/dto/create-organization.dto';

const PASSWORD_RULE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
const PASSWORD_MESSAGE =
  'password must be at least 12 characters and include upper case, lower case, a digit and a symbol';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  @MaxLength(254)
  @Transform(normalizeEmail)
  email: string;

  @ApiProperty({ example: 'Ada' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName: string;

  @ApiProperty({ example: 'Lovelace' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName: string;

  @ApiProperty({ example: 'Str0ng!Passphrase' })
  @IsString()
  @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  @MaxLength(128)
  password: string;

  @ApiProperty({
    type: CreateOrganizationDto,
    description: 'The organization created for this first user, who becomes its admin',
  })
  @ValidateNested()
  @Type(() => CreateOrganizationDto)
  organization: CreateOrganizationDto;
}

export class LoginDto {
  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  @MaxLength(254)
  @Transform(normalizeEmail)
  email: string;

  @ApiProperty({ example: 'Str0ng!Passphrase' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Organization to sign in to when the account belongs to several',
  })
  @IsOptional()
  @IsUUID('4')
  organizationId?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  @MaxLength(254)
  @Transform(normalizeEmail)
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Single-use token from the reset link' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token: string;

  @ApiProperty()
  @IsString()
  @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  @MaxLength(128)
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  @MaxLength(128)
  newPassword: string;
}

export class AcceptInvitationDto {
  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  @MaxLength(254)
  @Transform(normalizeEmail)
  email: string;

  @ApiProperty()
  @IsString()
  @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  @MaxLength(128)
  password: string;

  @ApiProperty({ format: 'uuid', description: 'Organization the invitation was issued for' })
  @IsUUID('4')
  organizationId: string;
}

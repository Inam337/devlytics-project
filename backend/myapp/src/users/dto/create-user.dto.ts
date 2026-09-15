import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleKey } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Invites a person into the organization. No password is set here — the
 * invitee sets one through the invitation acceptance flow.
 */
export class CreateUserDto {
  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
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

  @ApiProperty({ enum: RoleKey, example: RoleKey.DEVELOPER })
  @IsEnum(RoleKey)
  roleKey: RoleKey;

  @ApiPropertyOptional({ format: 'uuid', description: 'Optional team to join on acceptance' })
  @IsOptional()
  @IsUUID('4')
  teamId?: string;

  @ApiPropertyOptional({ example: 'Senior Engineer' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;

  @ApiPropertyOptional({ example: 'EMP-0042' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  employeeCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  avatarUrl?: string;
}

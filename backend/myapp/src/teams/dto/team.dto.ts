import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AvatarType, TeamStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CreateTeamDto {
  @ApiProperty({ example: 'Frontend Core' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiProperty({ example: 'FE-CORE', description: 'Unique within the organization' })
  @IsString()
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9-_]*$/, {
    message: 'code must be alphanumeric and may contain hyphens or underscores',
  })
  code: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  departmentId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Team lead (must be a member)' })
  @IsOptional()
  @IsUUID('4')
  teamLeadId?: string;

  @ApiPropertyOptional({ enum: AvatarType, default: AvatarType.INITIALS })
  @IsOptional()
  @IsEnum(AvatarType)
  avatarType?: AvatarType;

  @ApiPropertyOptional({ description: 'Required when avatarType is IMAGE or ICON' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  avatarUrl?: string;

  @ApiPropertyOptional({ example: '#372b73' })
  @IsOptional()
  @IsHexColor()
  teamColor?: string;
}

export class UpdateTeamDto extends PartialType(CreateTeamDto) {
  @ApiPropertyOptional({ enum: TeamStatus })
  @IsOptional()
  @IsEnum(TeamStatus)
  status?: TeamStatus;

  @ApiPropertyOptional({ description: 'Reason recorded on the audit entry' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AddTeamMemberDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  userId: string;

  @ApiPropertyOptional({ example: 'Senior Frontend Engineer' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  positionTitle?: string;
}

export class TeamQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  departmentId?: string;

  @ApiPropertyOptional({ enum: TeamStatus })
  @IsOptional()
  @IsEnum(TeamStatus)
  status?: TeamStatus;
}

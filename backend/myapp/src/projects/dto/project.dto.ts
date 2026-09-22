import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CreateProjectDto {
  @ApiProperty({ example: 'Payments Platform' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiProperty({
    example: 'PAY-01',
    description: 'Unique within the organization',
  })
  @IsString()
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9-_]*$/, {
    message: 'code must be alphanumeric and may contain hyphens or underscores',
  })
  code: string;

  @ApiPropertyOptional({ example: 'PAY' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  projectKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional({ enum: ProjectStatus, default: ProjectStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  ownerId?: string;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'Teams working on it',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  teamIds?: string[];

  @ApiPropertyOptional({ example: '2026-01-15' })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercent?: number;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @ApiPropertyOptional({ description: 'Reason recorded on the audit entry' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AddProjectMemberDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  userId: string;

  @ApiPropertyOptional({ example: 'Tech Lead' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  roleLabel?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  allocationPercent?: number;
}

export class ProjectQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  teamId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  ownerId?: string;
}

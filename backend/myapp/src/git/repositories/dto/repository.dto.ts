import { ApiPropertyOptional } from '@nestjs/swagger';
import { SyncStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class RepositoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  providerId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  projectId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  teamId?: string;

  @ApiPropertyOptional({ enum: SyncStatus })
  @IsOptional()
  @IsEnum(SyncStatus)
  syncStatus?: SyncStatus;

  @ApiPropertyOptional({ example: 'TypeScript' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  language?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeArchived?: boolean;
}

export class UpdateRepositoryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Project this repository belongs to' })
  @IsOptional()
  @IsUUID('4')
  projectId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Team that owns this repository' })
  @IsOptional()
  @IsUUID('4')
  teamId?: string;
}

/** Shared filter for every engineering-activity list under a repository. */
export class ActivityQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'ISO-8601 lower bound' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO-8601 upper bound' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Restrict to one developer' })
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter to a branch' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  branch?: string;

  @ApiPropertyOptional({ description: 'Provider status value, e.g. MERGED or CLOSED' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Include automation accounts, which are excluded from scoring',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeBots?: boolean;
}

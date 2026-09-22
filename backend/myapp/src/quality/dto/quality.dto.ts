import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IssueSeverity,
  QualityCategory,
  QualityIssueStatus,
} from '@prisma/client';
import { IsEnum, IsOptional, IsUUID, IsISO8601 } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class QualitySnapshotQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  repositoryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class QualityIssueQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  repositoryId?: string;

  @ApiPropertyOptional({ enum: QualityCategory })
  @IsOptional()
  @IsEnum(QualityCategory)
  category?: QualityCategory;

  @ApiPropertyOptional({ enum: IssueSeverity })
  @IsOptional()
  @IsEnum(IssueSeverity)
  severity?: IssueSeverity;

  @ApiPropertyOptional({ enum: QualityIssueStatus })
  @IsOptional()
  @IsEnum(QualityIssueStatus)
  status?: QualityIssueStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  assignedUserId?: string;
}

export class UpdateQualityIssueStatusDto {
  @ApiPropertyOptional({ enum: QualityIssueStatus })
  @IsEnum(QualityIssueStatus)
  status: QualityIssueStatus;
}

export class TriggerScanDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Repository to scan' })
  @IsUUID('4')
  repositoryId: string;
}

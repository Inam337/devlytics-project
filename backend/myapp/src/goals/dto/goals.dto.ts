import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GoalDirection, GoalOwnerType, GoalStatus, QualityCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

/** Metric keys `GoalsService` knows how to re-measure from stored evidence. */
export const GOAL_METRIC_KEYS = [
  'quality_score',
  'coverage_percent',
  'duplication_percent',
  'complexity',
  'maintainability_score',
  'bugs',
  'code_smells',
  'vulnerabilities',
  'technical_debt_minutes',
] as const;
export type GoalMetricKey = (typeof GOAL_METRIC_KEYS)[number];

export class CreateGoalDto {
  @ApiProperty({ example: 'Raise payments-api coverage to 80%' })
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: GoalOwnerType })
  @IsEnum(GoalOwnerType)
  ownerType: GoalOwnerType;

  @ApiPropertyOptional({ format: 'uuid', description: 'Required when ownerType is DEVELOPER' })
  @IsOptional()
  @IsUUID('4')
  ownerUserId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Required when ownerType is TEAM' })
  @IsOptional()
  @IsUUID('4')
  ownerTeamId?: string;

  @ApiProperty({ format: 'uuid', description: 'Repository the goal measures against' })
  @IsUUID('4')
  repositoryId: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  qualityIssueId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  recommendationId?: string;

  @ApiProperty({ enum: QualityCategory })
  @IsEnum(QualityCategory)
  category: QualityCategory;

  @ApiProperty({ enum: GOAL_METRIC_KEYS })
  @IsString()
  metricKey: GoalMetricKey;

  @ApiProperty({ enum: GoalDirection, description: 'Whether the target is above or below baseline' })
  @IsEnum(GoalDirection)
  direction: GoalDirection;

  @ApiProperty({ example: 80 })
  @Type(() => Number)
  @IsNumber()
  targetValue: number;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsISO8601()
  dueDate?: string;
}

export class UpdateGoalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: GoalStatus, description: 'ABANDONED is the only manual transition' })
  @IsOptional()
  @IsEnum(GoalStatus)
  status?: GoalStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  dueDate?: string;
}

export class GoalsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: GoalStatus })
  @IsOptional()
  @IsEnum(GoalStatus)
  status?: GoalStatus;

  @ApiPropertyOptional({ enum: GoalOwnerType })
  @IsOptional()
  @IsEnum(GoalOwnerType)
  ownerType?: GoalOwnerType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  ownerUserId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  ownerTeamId?: string;
}

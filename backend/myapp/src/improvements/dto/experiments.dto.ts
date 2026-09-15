import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExperimentStatus, MetricDirection, MetricType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
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

/**
 * Metric keys `MetricCalculationService` knows how to derive from stored
 * engineering activity. A metric cannot be added to an experiment unless the
 * backend can calculate it reliably — see docs pasted spec §17.
 */
export const EXPERIMENT_METRIC_KEYS = [
  'review_cycle_time',
  'pr_size',
  'files_changed_per_pr',
  'reviewer_load',
  'ci_wait_time',
  'deployment_frequency',
  'deployment_failure_rate',
  'lead_time',
  'commit_frequency',
  'code_quality_score',
  'quality_issue_count',
  'critical_issue_count',
  'bug_rate',
  'test_coverage',
  'build_success_rate',
] as const;
export type ExperimentMetricKey = (typeof EXPERIMENT_METRIC_KEYS)[number];

/** Manual transitions allowed through PATCH; every other status change goes through a lifecycle endpoint. */
export const MANUAL_STATUS_TARGETS: ExperimentStatus[] = ['PLANNED', 'CANCELLED'];

export class CreateExperimentDto {
  @ApiProperty({ example: 'Reduce PR Review Time' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'Improve review efficiency by reducing PR size.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 'Average PR review time increased significantly.' })
  @IsString()
  @MaxLength(2000)
  problemStatement: string;

  @ApiProperty({ example: 'Reducing PR size will reduce review cycle time.' })
  @IsString()
  @MaxLength(2000)
  hypothesis: string;

  @ApiProperty({ example: 'Encourage smaller PRs and improve reviewer distribution.' })
  @IsString()
  @MaxLength(2000)
  intervention: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Owning developer; defaults to the creator when no other scope is given' })
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  teamId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  projectId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  repositoryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  recommendationId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  goalId?: string;

  @ApiProperty({ example: '2026-09-15T00:00:00.000Z' })
  @IsISO8601()
  startDate: string;

  @ApiPropertyOptional({ example: '2026-10-15T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  endDate?: string;
}

export class UpdateExperimentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  problemStatement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  hypothesis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  intervention?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({
    enum: MANUAL_STATUS_TARGETS,
    description: 'Only PLANNED (schedule from DRAFT) and CANCELLED can be set manually; use the lifecycle endpoints otherwise',
  })
  @IsOptional()
  @IsEnum(ExperimentStatus)
  status?: ExperimentStatus;
}

export class ExperimentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ExperimentStatus })
  @IsOptional()
  @IsEnum(ExperimentStatus)
  status?: ExperimentStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  teamId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  projectId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  repositoryId?: string;
}

export class CreateExperimentMetricDto {
  @ApiProperty({ example: 'Review Cycle Time' })
  @IsString()
  @MaxLength(100)
  metricName: string;

  @ApiProperty({ enum: EXPERIMENT_METRIC_KEYS, example: 'review_cycle_time' })
  @IsEnum(EXPERIMENT_METRIC_KEYS)
  metricKey: ExperimentMetricKey;

  @ApiProperty({ enum: MetricType })
  @IsEnum(MetricType)
  metricType: MetricType;

  @ApiPropertyOptional({ example: 'hours' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @ApiProperty({ enum: MetricDirection })
  @IsEnum(MetricDirection)
  direction: MetricDirection;

  @ApiPropertyOptional({
    example: 8.4,
    description: 'Baseline value; when omitted the backend calculates it from stored activity for the period before startDate',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  baselineValue?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  targetValue?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateExperimentMetricDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  metricName?: string;

  @ApiPropertyOptional({ example: 'hours' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  targetValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

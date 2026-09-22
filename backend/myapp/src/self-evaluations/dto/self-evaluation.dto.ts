import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  RankingPeriod,
  ScoreCategory,
  SelfEvaluationStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class SelfEvaluationItemDto {
  @ApiProperty({ enum: ScoreCategory })
  @IsEnum(ScoreCategory)
  category: ScoreCategory;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  selfRating: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class CreateSelfEvaluationDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  repositoryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  projectId?: string;

  @ApiPropertyOptional({ enum: RankingPeriod, default: RankingPeriod.MONTHLY })
  @IsOptional()
  @IsEnum(RankingPeriod)
  period?: RankingPeriod;

  @ApiProperty({ example: '2026-09-01' })
  @IsISO8601()
  periodStart: string;

  @ApiProperty({ example: '2026-09-30' })
  @IsISO8601()
  periodEnd: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  summary?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating?: number;

  @ApiProperty({ type: [SelfEvaluationItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SelfEvaluationItemDto)
  items: SelfEvaluationItemDto[];
}

export class UpdateSelfEvaluationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  summary?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating?: number;

  @ApiPropertyOptional({
    enum: SelfEvaluationStatus,
    description: 'DRAFT -> SUBMITTED by the owner',
  })
  @IsOptional()
  @IsEnum(SelfEvaluationStatus)
  status?: SelfEvaluationStatus;

  @ApiPropertyOptional({
    description: 'Reviewer-only: notes recorded alongside REVIEWED',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  reviewerNotes?: string;
}

export class SelfEvaluationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SelfEvaluationStatus })
  @IsOptional()
  @IsEnum(SelfEvaluationStatus)
  status?: SelfEvaluationStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  userId?: string;
}

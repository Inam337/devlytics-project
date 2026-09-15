import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScoreCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ScoringWeightEntryDto {
  @ApiProperty({ enum: ScoreCategory })
  @IsEnum(ScoreCategory)
  category: ScoreCategory;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  weightPercent: number;
}

export class SetScoringWeightsDto {
  @ApiProperty({
    type: [ScoringWeightEntryDto],
    description: 'All eight categories, weights must total exactly 100%',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ScoringWeightEntryDto)
  categories: ScoringWeightEntryDto[];

  @ApiPropertyOptional({ description: 'Reason recorded on the audit entry' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

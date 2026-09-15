import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QualityCategory, RecommendationStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class RecommendationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RecommendationStatus })
  @IsOptional()
  @IsEnum(RecommendationStatus)
  status?: RecommendationStatus;

  @ApiPropertyOptional({ enum: QualityCategory })
  @IsOptional()
  @IsEnum(QualityCategory)
  category?: QualityCategory;
}

export class UpdateRecommendationDto {
  @ApiProperty({ enum: RecommendationStatus })
  @IsEnum(RecommendationStatus)
  status: RecommendationStatus;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { RankingPeriod, RankingSubjectType } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class RankingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RankingPeriod, default: RankingPeriod.MONTHLY })
  @IsOptional()
  @IsEnum(RankingPeriod)
  period?: RankingPeriod;

  @ApiPropertyOptional({
    description: 'Any date within the target period, defaults to today',
  })
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  teamId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  departmentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @ApiPropertyOptional({ enum: RankingSubjectType })
  @IsOptional()
  @IsEnum(RankingSubjectType)
  subjectType?: RankingSubjectType;
}

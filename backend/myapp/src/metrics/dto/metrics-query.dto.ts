import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class MetricsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'ISO-8601 lower bound, defaults to 30 days before `to`' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO-8601 upper bound, defaults to today' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  teamId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  departmentId?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class ReportQueryDto {
  @ApiPropertyOptional({
    description: 'ISO-8601 lower bound, defaults to 30 days before `to`',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    description: 'ISO-8601 upper bound, defaults to today',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  departmentId?: string;

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

  @ApiPropertyOptional({ enum: ['json', 'csv', 'pdf'], default: 'json' })
  @IsOptional()
  @IsEnum(['json', 'csv', 'pdf'])
  format?: 'json' | 'csv' | 'pdf';
}

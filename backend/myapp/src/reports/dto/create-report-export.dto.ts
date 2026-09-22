import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportFormat, ReportType } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class CreateReportExportDto {
  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  reportType: ReportType;

  @ApiProperty({ enum: ReportFormat })
  @IsEnum(ReportFormat)
  format: ReportFormat;

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

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Also the scope for a TEAM_AI_ANALYSIS export',
  })
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

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Required when reportType is INDIVIDUAL_AI_ANALYSIS',
  })
  @ValidateIf((dto) => dto.reportType === ReportType.INDIVIDUAL_AI_ANALYSIS)
  @IsUUID('4')
  targetUserId?: string;
}

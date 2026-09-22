import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuditCategory } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class AuditLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AuditCategory })
  @IsOptional()
  @IsEnum(AuditCategory)
  category?: AuditCategory;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  actorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  entityType?: string;

  @ApiPropertyOptional({ description: 'ISO-8601 lower bound on createdAt' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO-8601 upper bound on createdAt' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}

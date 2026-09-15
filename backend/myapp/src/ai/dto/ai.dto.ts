import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AiProviderType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CreateAiIntegrationDto {
  @ApiProperty({ enum: AiProviderType })
  @IsEnum(AiProviderType)
  providerType: AiProviderType;

  @ApiProperty({ example: 'Team Ollama' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'llama3.1' })
  @IsString()
  @MaxLength(120)
  model: string;

  @ApiPropertyOptional({ description: 'Required for external providers, stored encrypted' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  baseUrl?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: true, description: 'Route context through the sanitizer' })
  @IsOptional()
  @IsBoolean()
  sanitizeContext?: boolean;
}

export class UpdateAiIntegrationDto extends PartialType(CreateAiIntegrationDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class TriggerAnalysisDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  repositoryId: string;
}

export class AnalysisQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  repositoryId?: string;
}

export class AiUsageQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  teamId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 366, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(366)
  days?: number;
}

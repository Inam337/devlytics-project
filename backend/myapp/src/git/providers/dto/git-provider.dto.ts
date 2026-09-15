import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ConnectProviderDto {
  @ApiProperty({
    description:
      'Read-only personal access token or OAuth access token. Stored encrypted at rest.',
  })
  @IsString()
  @MaxLength(500)
  accessToken: string;

  @ApiPropertyOptional({ description: 'Self-hosted API base URL' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  baseUrl?: string;

  @ApiPropertyOptional({ description: 'Organization / group to scope discovery to' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  externalAccountName?: string;

  @ApiPropertyOptional({ description: 'Secret used to validate inbound webhook signatures' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  webhookSecret?: string;

  @ApiPropertyOptional({ description: 'Refresh token when the OAuth flow provides one' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  refreshToken?: string;
}

export class ImportRepositoryDto {
  @ApiProperty({ description: 'Provider-side repository id' })
  @IsString()
  @MaxLength(120)
  externalRepositoryId: string;

  @ApiProperty({ example: 'northwind/payments-api' })
  @IsString()
  @MaxLength(255)
  fullName: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  projectId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  teamId?: string;
}

export class ImportRepositoriesDto {
  @ApiProperty({ type: [ImportRepositoryDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ImportRepositoryDto)
  repositories: ImportRepositoryDto[];

  @ApiPropertyOptional({
    default: true,
    description: 'Queue the 12-month history import immediately after import',
  })
  @IsOptional()
  @IsBoolean()
  startSync?: boolean;
}

export class LinkGitIdentityDto {
  @ApiProperty({ format: 'uuid', description: 'Devlytics user to attach the identity to' })
  @IsUUID('4')
  userId: string;
}

export class ClassifyGitIdentityDto {
  @ApiProperty({ description: 'Mark the identity as an automation account' })
  @IsBoolean()
  isBot: boolean;
}

export class DiscoverQueryDto {
  @ApiPropertyOptional({ type: [String], description: 'Filter discovery to these full names' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  fullNames?: string[];
}

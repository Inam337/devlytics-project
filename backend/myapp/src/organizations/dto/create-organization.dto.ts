import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsHexColor, IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Northwind Engineering' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({
    example: 'northwind-engineering',
    description: 'URL-safe identifier. Derived from the name when omitted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase alphanumeric words separated by single hyphens',
  })
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'Software' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({ example: 'Europe/Berlin' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/favicon.ico' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  faviconUrl?: string;

  @ApiPropertyOptional({ example: '#372b73' })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#0B7D9E' })
  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  @ApiPropertyOptional({ example: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  dateFormat?: string;

  @ApiPropertyOptional({ example: 'EUR' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;
}

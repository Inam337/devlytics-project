import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Platform Engineering' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiProperty({ example: 'PLATFORM' })
  @IsString()
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9-_]*$/, {
    message: 'code must be alphanumeric and may contain hyphens or underscores',
  })
  code: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Department manager (must be a member)' })
  @IsOptional()
  @IsUUID('4')
  managerId?: string;
}

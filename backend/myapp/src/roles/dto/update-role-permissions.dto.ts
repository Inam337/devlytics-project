import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateRolePermissionsDto {
  @ApiProperty({
    type: [String],
    example: ['team:read', 'team:write'],
    description:
      'The complete permission set for this role — it replaces the existing grants',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  permissions: string[];

  @ApiPropertyOptional({ description: 'Reason recorded on the audit entry' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

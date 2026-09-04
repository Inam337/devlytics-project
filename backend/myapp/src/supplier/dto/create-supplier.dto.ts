import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSupplierDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

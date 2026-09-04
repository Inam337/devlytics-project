import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ProductType } from '../../entities/product-type.enum';

export class CreateProductDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  reorderLevel: number;

  @IsString()
  @MaxLength(50)
  unit: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @IsEnum(ProductType)
  type: ProductType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;
}

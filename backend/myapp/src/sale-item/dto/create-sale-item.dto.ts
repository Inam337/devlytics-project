import { Type } from 'class-transformer';
import { IsInt, IsNumber, Min } from 'class-validator';

export class CreateSaleItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  saleId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number;
}

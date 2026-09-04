import { Type } from 'class-transformer';
import { IsInt, IsNumber, Min } from 'class-validator';

export class CreatePurchaseItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  purchaseId: number;

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

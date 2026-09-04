import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { PurchaseLineDto } from './purchase-line.dto';

export class CreatePurchaseDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseLineDto)
  items: PurchaseLineDto[];
}

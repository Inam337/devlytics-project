import { Type } from 'class-transformer';
import { IsInt, IsString, MaxLength, Min } from 'class-validator';

export class CreateStockDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity: number;

  @IsString()
  @MaxLength(100)
  location: string;
}

import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { SaleLineDto } from './sale-line.dto';

export class CreateSaleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleLineDto)
  items: SaleLineDto[];
}

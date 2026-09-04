import { Type } from 'class-transformer';
import { IsEnum, IsInt, Min } from 'class-validator';
import { PaymentMethod } from '../enums/payment-method.enum';

export class CreatePaymentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;
}

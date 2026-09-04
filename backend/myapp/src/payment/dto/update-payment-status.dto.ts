import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaymentStatus } from '../enums/payment-status.enum';

export class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  transactionId?: string;
}

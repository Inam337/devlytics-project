import type { DecimalAmount, IsoDateString } from './common';
import type { PaymentMethod } from './enums/PaymentMethod';
import type { PaymentStatus } from './enums/PaymentStatus';
import type { Order } from './Order';

export interface Payment {
  id: number;
  amount: DecimalAmount;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string | null;
  order?: Order;
  createdAt?: IsoDateString;
  updatedAt?: IsoDateString;
}

export interface CreatePaymentRequest {
  orderId: number;
  method: PaymentMethod;
}

export interface UpdatePaymentStatusRequest {
  status: PaymentStatus;
  transactionId?: string;
}

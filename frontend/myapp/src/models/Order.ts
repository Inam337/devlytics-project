import type { DecimalAmount, IsoDateString } from './common';
import type { OrderStatus } from './enums/OrderStatus';
import type { OrderItem } from './OrderItem';
import type { Payment } from './Payment';

export interface Order {
  id: number;
  totalAmount: DecimalAmount;
  status: OrderStatus;
  isPaid: boolean;
  items?: OrderItem[];
  payments?: Payment[];
  createdAt?: IsoDateString;
  updatedAt?: IsoDateString;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

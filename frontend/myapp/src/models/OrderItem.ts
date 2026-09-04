import type { DecimalAmount, IsoDateString } from './common';
import type { Product } from './Product';
import type { Order } from './Order';

export interface OrderItem {
  id: number;
  quantity: number;
  price: DecimalAmount;
  product?: Product;
  order?: Order;
  createdAt?: IsoDateString;
}

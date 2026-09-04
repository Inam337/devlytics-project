import type { IsoDateString } from './common';
import type { Product } from './Product';

export interface CartItem {
  id: number;
  quantity: number;
  product: Product;
  createdAt?: IsoDateString;
  updatedAt?: IsoDateString;
}

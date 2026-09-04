import type { IsoDateString } from './common';
import type { CartItem } from './CartItem';

export interface Cart {
  id: number;
  items: CartItem[];
  createdAt?: IsoDateString;
  updatedAt?: IsoDateString;
}

export interface AddToCartRequest {
  productId: number;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

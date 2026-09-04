import type { IsoDateString } from './common';
import type { Product } from './Product';

export interface Stock {
  id: number;
  quantity: number;
  location: string;
  product?: Product;
  lastUpdated?: IsoDateString;
}

export interface CreateStockRequest {
  productId: number;
  quantity: number;
  location: string;
}

export type UpdateStockRequest = Partial<CreateStockRequest>;

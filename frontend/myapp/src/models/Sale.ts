import type { DecimalAmount, IsoDateString } from './common';
import type { SaleItem } from './SaleItem';

export interface Sale {
  id: number;
  totalAmount: DecimalAmount;
  items?: SaleItem[];
  soldAt?: IsoDateString;
}

export interface SaleItemInput {
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface CreateSaleRequest {
  items: SaleItemInput[];
}

export interface UpdateSaleRequest {
  items: SaleItemInput[];
}

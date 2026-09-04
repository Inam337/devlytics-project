import type { DecimalAmount } from './common';
import type { Product } from './Product';
import type { Sale } from './Sale';

export interface SaleItem {
  id: number;
  quantity: number;
  unitPrice: DecimalAmount;
  product?: Product;
  sale?: Sale;
}

export interface CreateSaleItemRequest {
  saleId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
}

export type UpdateSaleItemRequest = Partial<Omit<CreateSaleItemRequest, 'saleId'>>;

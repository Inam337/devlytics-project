import type { DecimalAmount } from './common';
import type { Product } from './Product';
import type { Purchase } from './Purchase';

export interface PurchaseItem {
  id: number;
  quantity: number;
  unitPrice: DecimalAmount;
  product?: Product;
  purchase?: Purchase;
}

export interface CreatePurchaseItemRequest {
  purchaseId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
}

export type UpdatePurchaseItemRequest = Partial<
  Omit<CreatePurchaseItemRequest, 'purchaseId'>
>;

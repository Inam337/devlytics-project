import type { DecimalAmount, IsoDateString } from './common';
import type { PurchaseItem } from './PurchaseItem';
import type { Supplier } from './Supplier';

export interface Purchase {
  id: number;
  totalAmount: DecimalAmount;
  supplier?: Supplier | null;
  items?: PurchaseItem[];
  purchasedAt?: IsoDateString;
}

export interface PurchaseItemInput {
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface CreatePurchaseRequest {
  supplierId: number;
  items: PurchaseItemInput[];
}

export interface UpdatePurchaseRequest {
  supplierId?: number;
  items?: PurchaseItemInput[];
}

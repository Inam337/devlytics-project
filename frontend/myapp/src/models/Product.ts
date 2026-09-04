import type { DecimalAmount, IsoDateString } from './common';
import type { ProductType } from './enums/ProductType';
import type { Category } from './Category';
import type { Stock } from './Stock';

export interface Product {
  id: number;
  name: string;
  description?: string;
  sku?: string;
  price: DecimalAmount;
  unit: string;
  reorderLevel: number;
  type: ProductType;
  isActive: boolean;
  category?: Category | null;
  stockEntries?: Stock[];
  createdAt?: IsoDateString;
  updatedAt?: IsoDateString;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  price: number;
  reorderLevel: number;
  unit: string;
  sku?: string;
  type: ProductType;
  categoryId?: number;
}

export type UpdateProductRequest = Partial<CreateProductRequest>;

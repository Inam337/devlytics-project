import type { Product } from './Product';

export interface Category {
  id: number;
  name: string;
  description?: string;
  products?: Product[];
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
}

export type UpdateCategoryRequest = Partial<CreateCategoryRequest>;

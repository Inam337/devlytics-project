import type { Purchase } from './Purchase';

export interface Supplier {
  id: number;
  name: string;
  contactNumber?: string;
  address?: string;
  purchases?: Purchase[];
}

export interface CreateSupplierRequest {
  name: string;
  contactNumber?: string;
  address?: string;
}

export type UpdateSupplierRequest = Partial<CreateSupplierRequest>;

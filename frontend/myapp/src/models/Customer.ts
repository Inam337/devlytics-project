export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address?: string;
}

export interface CreateCustomerRequest {
  name: string;
  email: string;
  phone: string;
  address?: string;
}

export type UpdateCustomerRequest = Partial<CreateCustomerRequest>;

import { AppConstants } from '@/common/AppConstants';
import type {
  ApiResult,
  CreateCustomerRequest,
  Customer,
  UpdateCustomerRequest,
} from '@/models';
import { apiDelete, apiGet, apiPost, apiPut } from '@/services/api-request';

export const listCustomers = (): Promise<ApiResult<Customer[]>> =>
  apiGet<Customer[]>(AppConstants.ApiUrls.Customers);

export const getCustomer = (id: number | string): Promise<ApiResult<Customer>> =>
  apiGet<Customer>(AppConstants.ApiUrlBuilders.customer(id));

export const createCustomer = (
  payload: CreateCustomerRequest,
): Promise<ApiResult<Customer>> =>
  apiPost<Customer>(AppConstants.ApiUrls.Customers, payload);

export const updateCustomer = (
  id: number | string,
  payload: UpdateCustomerRequest,
): Promise<ApiResult<Customer>> =>
  apiPut<Customer>(AppConstants.ApiUrlBuilders.customer(id), payload);

export const deleteCustomer = (id: number | string): Promise<ApiResult<Customer>> =>
  apiDelete<Customer>(AppConstants.ApiUrlBuilders.customer(id));

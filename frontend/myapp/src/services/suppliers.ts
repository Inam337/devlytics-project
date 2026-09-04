import { AppConstants } from '@/common/AppConstants';
import type {
  ApiResult,
  CreateSupplierRequest,
  Supplier,
  UpdateSupplierRequest,
} from '@/models';
import { apiDelete, apiGet, apiPost, apiPut } from '@/services/api-request';

export const listSuppliers = (): Promise<ApiResult<Supplier[]>> =>
  apiGet<Supplier[]>(AppConstants.ApiUrls.Suppliers);

export const getSupplier = (id: number | string): Promise<ApiResult<Supplier>> =>
  apiGet<Supplier>(AppConstants.ApiUrlBuilders.supplier(id));

export const createSupplier = (
  payload: CreateSupplierRequest,
): Promise<ApiResult<Supplier>> =>
  apiPost<Supplier>(AppConstants.ApiUrls.Suppliers, payload);

export const updateSupplier = (
  id: number | string,
  payload: UpdateSupplierRequest,
): Promise<ApiResult<Supplier>> =>
  apiPut<Supplier>(AppConstants.ApiUrlBuilders.supplier(id), payload);

export const deleteSupplier = (id: number | string): Promise<ApiResult<Supplier>> =>
  apiDelete<Supplier>(AppConstants.ApiUrlBuilders.supplier(id));

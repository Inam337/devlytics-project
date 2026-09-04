import { AppConstants } from '@/common/AppConstants';
import type {
  ApiResult,
  CreateSaleItemRequest,
  SaleItem,
  UpdateSaleItemRequest,
} from '@/models';
import { apiDelete, apiGet, apiPost, apiPut } from '@/services/api-request';

export const listSaleItems = (): Promise<ApiResult<SaleItem[]>> =>
  apiGet<SaleItem[]>(AppConstants.ApiUrls.SaleItems);

export const getSaleItem = (id: number | string): Promise<ApiResult<SaleItem>> =>
  apiGet<SaleItem>(AppConstants.ApiUrlBuilders.saleItem(id));

export const createSaleItem = (
  payload: CreateSaleItemRequest,
): Promise<ApiResult<SaleItem>> =>
  apiPost<SaleItem>(AppConstants.ApiUrls.SaleItems, payload);

export const updateSaleItem = (
  id: number | string,
  payload: UpdateSaleItemRequest,
): Promise<ApiResult<SaleItem>> =>
  apiPut<SaleItem>(AppConstants.ApiUrlBuilders.saleItem(id), payload);

export const deleteSaleItem = (id: number | string): Promise<ApiResult<SaleItem>> =>
  apiDelete<SaleItem>(AppConstants.ApiUrlBuilders.saleItem(id));

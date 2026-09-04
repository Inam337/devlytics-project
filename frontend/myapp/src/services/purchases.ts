import { AppConstants } from '@/common/AppConstants';
import type {
  ApiResult,
  CreatePurchaseRequest,
  Purchase,
  UpdatePurchaseRequest,
} from '@/models';
import { apiDelete, apiGet, apiPost, apiPut } from '@/services/api-request';

export const listPurchases = (): Promise<ApiResult<Purchase[]>> =>
  apiGet<Purchase[]>(AppConstants.ApiUrls.Purchases);

export const getPurchase = (id: number | string): Promise<ApiResult<Purchase>> =>
  apiGet<Purchase>(AppConstants.ApiUrlBuilders.purchase(id));

export const createPurchase = (
  payload: CreatePurchaseRequest,
): Promise<ApiResult<Purchase>> =>
  apiPost<Purchase>(AppConstants.ApiUrls.Purchases, payload);

export const updatePurchase = (
  id: number | string,
  payload: UpdatePurchaseRequest,
): Promise<ApiResult<Purchase>> =>
  apiPut<Purchase>(AppConstants.ApiUrlBuilders.purchase(id), payload);

export const deletePurchase = (id: number | string): Promise<ApiResult<Purchase>> =>
  apiDelete<Purchase>(AppConstants.ApiUrlBuilders.purchase(id));

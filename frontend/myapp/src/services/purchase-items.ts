import { AppConstants } from '@/common/AppConstants';
import type {
  ApiResult,
  CreatePurchaseItemRequest,
  PurchaseItem,
  UpdatePurchaseItemRequest,
} from '@/models';
import { apiDelete, apiGet, apiPost, apiPut } from '@/services/api-request';

export const listPurchaseItems = (): Promise<ApiResult<PurchaseItem[]>> =>
  apiGet<PurchaseItem[]>(AppConstants.ApiUrls.PurchaseItems);

export const getPurchaseItem = (id: number | string): Promise<ApiResult<PurchaseItem>> =>
  apiGet<PurchaseItem>(AppConstants.ApiUrlBuilders.purchaseItem(id));

export const createPurchaseItem = (
  payload: CreatePurchaseItemRequest,
): Promise<ApiResult<PurchaseItem>> =>
  apiPost<PurchaseItem>(AppConstants.ApiUrls.PurchaseItems, payload);

export const updatePurchaseItem = (
  id: number | string,
  payload: UpdatePurchaseItemRequest,
): Promise<ApiResult<PurchaseItem>> =>
  apiPut<PurchaseItem>(AppConstants.ApiUrlBuilders.purchaseItem(id), payload);

export const deletePurchaseItem = (
  id: number | string,
): Promise<ApiResult<PurchaseItem>> =>
  apiDelete<PurchaseItem>(AppConstants.ApiUrlBuilders.purchaseItem(id));

import { AppConstants } from '@/common/AppConstants';
import type {
  ApiResult,
  CreateStockRequest,
  Stock,
  UpdateStockRequest,
} from '@/models';
import { apiDelete, apiGet, apiPost, apiPut } from '@/services/api-request';

export const listStocks = (): Promise<ApiResult<Stock[]>> =>
  apiGet<Stock[]>(AppConstants.ApiUrls.Stocks);

export const getStock = (id: number | string): Promise<ApiResult<Stock>> =>
  apiGet<Stock>(AppConstants.ApiUrlBuilders.stock(id));

export const createStock = (payload: CreateStockRequest): Promise<ApiResult<Stock>> =>
  apiPost<Stock>(AppConstants.ApiUrls.Stocks, payload);

export const updateStock = (
  id: number | string,
  payload: UpdateStockRequest,
): Promise<ApiResult<Stock>> =>
  apiPut<Stock>(AppConstants.ApiUrlBuilders.stock(id), payload);

export const deleteStock = (id: number | string): Promise<ApiResult<Stock>> =>
  apiDelete<Stock>(AppConstants.ApiUrlBuilders.stock(id));

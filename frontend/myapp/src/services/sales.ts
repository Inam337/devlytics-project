import { AppConstants } from '@/common/AppConstants';
import type {
  ApiResult,
  CreateSaleRequest,
  Sale,
  UpdateSaleRequest,
} from '@/models';
import { apiDelete, apiGet, apiPost, apiPut } from '@/services/api-request';

export const listSales = (): Promise<ApiResult<Sale[]>> =>
  apiGet<Sale[]>(AppConstants.ApiUrls.Sales);

export const getSale = (id: number | string): Promise<ApiResult<Sale>> =>
  apiGet<Sale>(AppConstants.ApiUrlBuilders.sale(id));

export const createSale = (payload: CreateSaleRequest): Promise<ApiResult<Sale>> =>
  apiPost<Sale>(AppConstants.ApiUrls.Sales, payload);

export const updateSale = (
  id: number | string,
  payload: UpdateSaleRequest,
): Promise<ApiResult<Sale>> =>
  apiPut<Sale>(AppConstants.ApiUrlBuilders.sale(id), payload);

export const deleteSale = (id: number | string): Promise<ApiResult<Sale>> =>
  apiDelete<Sale>(AppConstants.ApiUrlBuilders.sale(id));

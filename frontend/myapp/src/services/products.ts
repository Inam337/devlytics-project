import { AppConstants } from '@/common/AppConstants';
import type {
  ApiResult,
  CreateProductRequest,
  Product,
  UpdateProductRequest,
} from '@/models';
import { apiDelete, apiGet, apiPost, apiPut } from '@/services/api-request';

export const listProducts = (): Promise<ApiResult<Product[]>> =>
  apiGet<Product[]>(AppConstants.ApiUrls.Products);

export const getProduct = (id: number | string): Promise<ApiResult<Product>> =>
  apiGet<Product>(AppConstants.ApiUrlBuilders.product(id));

export const createProduct = (
  payload: CreateProductRequest,
): Promise<ApiResult<Product>> =>
  apiPost<Product>(AppConstants.ApiUrls.Products, payload);

export const updateProduct = (
  id: number | string,
  payload: UpdateProductRequest,
): Promise<ApiResult<Product>> =>
  apiPut<Product>(AppConstants.ApiUrlBuilders.product(id), payload);

export const deleteProduct = (id: number | string): Promise<ApiResult<Product>> =>
  apiDelete<Product>(AppConstants.ApiUrlBuilders.product(id));

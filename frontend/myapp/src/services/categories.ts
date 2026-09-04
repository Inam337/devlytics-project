import { AppConstants } from '@/common/AppConstants';
import type {
  ApiResult,
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@/models';
import { apiDelete, apiGet, apiPost, apiPut } from '@/services/api-request';

export const listCategories = (): Promise<ApiResult<Category[]>> =>
  apiGet<Category[]>(AppConstants.ApiUrls.Categories);

export const getCategory = (id: number | string): Promise<ApiResult<Category>> =>
  apiGet<Category>(AppConstants.ApiUrlBuilders.category(id));

export const createCategory = (
  payload: CreateCategoryRequest,
): Promise<ApiResult<Category>> =>
  apiPost<Category>(AppConstants.ApiUrls.Categories, payload);

export const updateCategory = (
  id: number | string,
  payload: UpdateCategoryRequest,
): Promise<ApiResult<Category>> =>
  apiPut<Category>(AppConstants.ApiUrlBuilders.category(id), payload);

export const deleteCategory = (id: number | string): Promise<ApiResult<Category>> =>
  apiDelete<Category>(AppConstants.ApiUrlBuilders.category(id));

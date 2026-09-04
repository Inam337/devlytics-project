import { AppConstants } from '@/common/AppConstants';
import type { AddToCartRequest, ApiResult, Cart } from '@/models';
import { apiDelete, apiGet, apiPost } from '@/services/api-request';

export const getCart = (): Promise<ApiResult<Cart>> =>
  apiGet<Cart>(AppConstants.ApiUrls.Cart);

export const addToCart = (payload: AddToCartRequest): Promise<ApiResult<Cart>> =>
  apiPost<Cart>(AppConstants.ApiUrls.CartItems, payload);

export const clearCart = (): Promise<ApiResult<Cart>> =>
  apiDelete<Cart>(AppConstants.ApiUrls.Cart);

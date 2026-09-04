import { AppConstants } from '@/common/AppConstants';
import type { ApiResult, CartItem, UpdateCartItemRequest } from '@/models';
import { apiDelete, apiPatch } from '@/services/api-request';

export const updateCartItem = (
  id: number | string,
  payload: UpdateCartItemRequest,
): Promise<ApiResult<CartItem>> =>
  apiPatch<CartItem>(AppConstants.ApiUrlBuilders.cartItem(id), payload);

export const removeCartItem = (id: number | string): Promise<ApiResult<CartItem>> =>
  apiDelete<CartItem>(AppConstants.ApiUrlBuilders.cartItem(id));

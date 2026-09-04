import { AppConstants } from '@/common/AppConstants';
import type { ApiResult, Order, UpdateOrderStatusRequest } from '@/models';
import { apiDelete, apiGet, apiPost, apiPut } from '@/services/api-request';

export const checkout = (): Promise<ApiResult<Order>> =>
  apiPost<Order>(AppConstants.ApiUrls.Checkout);

export const listOrders = (): Promise<ApiResult<Order[]>> =>
  apiGet<Order[]>(AppConstants.ApiUrls.Orders);

export const getOrder = (id: number | string): Promise<ApiResult<Order>> =>
  apiGet<Order>(AppConstants.ApiUrlBuilders.order(id));

export const updateOrderStatus = (
  id: number | string,
  payload: UpdateOrderStatusRequest,
): Promise<ApiResult<Order>> =>
  apiPut<Order>(AppConstants.ApiUrlBuilders.orderStatus(id), payload);

export const deleteOrder = (id: number | string): Promise<ApiResult<Order>> =>
  apiDelete<Order>(AppConstants.ApiUrlBuilders.order(id));

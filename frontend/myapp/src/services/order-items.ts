import { AppConstants } from '@/common/AppConstants';
import type { ApiResult, OrderItem } from '@/models';
import { apiGet } from '@/services/api-request';

export const listOrderItems = (): Promise<ApiResult<OrderItem[]>> =>
  apiGet<OrderItem[]>(AppConstants.ApiUrls.OrderItems);

export const getOrderItem = (id: number | string): Promise<ApiResult<OrderItem>> =>
  apiGet<OrderItem>(AppConstants.ApiUrlBuilders.orderItem(id));

import { AppConstants } from '@/common/AppConstants';
import type {
  ApiResult,
  CreatePaymentRequest,
  Payment,
  UpdatePaymentStatusRequest,
} from '@/models';
import { apiDelete, apiGet, apiPost, apiPut } from '@/services/api-request';

export const listPayments = (): Promise<ApiResult<Payment[]>> =>
  apiGet<Payment[]>(AppConstants.ApiUrls.Payments);

export const getPayment = (id: number | string): Promise<ApiResult<Payment>> =>
  apiGet<Payment>(AppConstants.ApiUrlBuilders.payment(id));

export const createPayment = (
  payload: CreatePaymentRequest,
): Promise<ApiResult<Payment>> =>
  apiPost<Payment>(AppConstants.ApiUrls.Payments, payload);

export const updatePaymentStatus = (
  id: number | string,
  payload: UpdatePaymentStatusRequest,
): Promise<ApiResult<Payment>> =>
  apiPut<Payment>(AppConstants.ApiUrlBuilders.paymentStatus(id), payload);

export const deletePayment = (id: number | string): Promise<ApiResult<Payment>> =>
  apiDelete<Payment>(AppConstants.ApiUrlBuilders.payment(id));

import { AppConstants } from '@/common/AppConstants';
import type {
  ApiResult,
  CreateUserRequest,
  UpdateUserRequest,
  UpdateUserStatusRequest,
  User,
} from '@/models';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/services/api-request';

export const listUsers = (): Promise<ApiResult<User[]>> =>
  apiGet<User[]>(AppConstants.ApiUrls.Users);

export const getUser = (id: number | string): Promise<ApiResult<User>> =>
  apiGet<User>(AppConstants.ApiUrlBuilders.user(id));

export const createUser = (payload: CreateUserRequest): Promise<ApiResult<User>> =>
  apiPost<User>(AppConstants.ApiUrls.Users, payload);

export const updateUser = (
  id: number | string,
  payload: UpdateUserRequest,
): Promise<ApiResult<User>> =>
  apiPatch<User>(AppConstants.ApiUrlBuilders.user(id), payload);

export const updateUserStatus = (
  id: number | string,
  payload: UpdateUserStatusRequest,
): Promise<ApiResult<User>> =>
  apiPatch<User>(AppConstants.ApiUrlBuilders.userStatus(id), payload);

export const deleteUser = (id: number | string): Promise<ApiResult<User>> =>
  apiDelete<User>(AppConstants.ApiUrlBuilders.user(id));

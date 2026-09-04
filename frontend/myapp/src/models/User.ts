import type { IsoDateString } from './common';

/** Public user shape — password is never returned by list/get APIs */
export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: boolean;
  createdAt?: IsoDateString;
  updatedAt?: IsoDateString;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}

export type UpdateUserRequest = Partial<
  Pick<CreateUserRequest, 'name' | 'email' | 'password'>
>;

export interface UpdateUserStatusRequest {
  isActive: boolean;
}

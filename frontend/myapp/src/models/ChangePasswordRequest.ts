/** Request body for POST /auth/change-password */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

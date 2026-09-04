/** Request body for POST /auth/register */
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

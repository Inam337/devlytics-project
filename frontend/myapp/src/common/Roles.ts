/** Mirrors backend `user.entity` role strings (default `'user'`). */
export const Roles = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

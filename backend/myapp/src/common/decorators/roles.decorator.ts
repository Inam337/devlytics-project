import { SetMetadata } from '@nestjs/common';
import { RoleKey } from '@prisma/client';

export const ROLES_KEY = 'devlytics:roles';

/**
 * Restricts a route to specific roles. Prefer `@RequirePermissions` — this is
 * for the handful of routes that are role-shaped rather than permission-shaped.
 */
export const RequireRoles = (...roles: RoleKey[]) => SetMetadata(ROLES_KEY, roles);

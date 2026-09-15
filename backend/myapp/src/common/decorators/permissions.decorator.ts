import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '../constants/permissions';

export const PERMISSIONS_KEY = 'devlytics:permissions';

/**
 * Declares the permissions a route requires. `PermissionsGuard` enforces them
 * against the caller's role, so no controller checks a role by hand.
 */
export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

import { RoleKey } from '@prisma/client';
import type { PermissionKey } from '../constants/permissions';

/**
 * The authenticated caller, resolved once by the JWT strategy and carried on the
 * request. `organizationId` is the tenant boundary — it is read from the verified
 * token and never from client-supplied input.
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  organizationId: string;
  membershipId: string;
  roleId: string;
  roleKey: RoleKey;
  permissions: PermissionKey[];
}

export interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

export interface JwtAccessPayload {
  sub: string;
  email: string;
  organizationId: string;
  roleKey: RoleKey;
  type: 'access';
}

export interface JwtRefreshPayload {
  sub: string;
  organizationId: string;
  familyId: string;
  jti: string;
  type: 'refresh';
}

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleKey } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AppException } from '../exceptions/app.exception';
import type { PermissionKey } from '../constants/permissions';
import type { AuthenticatedUser } from '../types/request-context';

/**
 * Enforces `@RequirePermissions` and `@RequireRoles` against the permission set
 * resolved for the caller's role at authentication time.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<PermissionKey[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredRoles = this.reflector.getAllAndOverride<RoleKey[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required?.length && !requiredRoles?.length) return true;

    const user = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>().user;
    if (!user) throw AppException.unauthorized();

    if (requiredRoles?.length && !requiredRoles.includes(user.roleKey)) {
      throw AppException.forbidden(
        `This action requires one of the following roles: ${requiredRoles.join(', ')}`,
      );
    }

    if (required?.length) {
      const missing = required.filter(
        (permission) => !user.permissions.includes(permission),
      );
      if (missing.length > 0) {
        throw AppException.forbidden(
          `Your role (${user.roleKey}) is missing the required permission: ${missing.join(', ')}`,
        );
      }
    }

    return true;
  }
}

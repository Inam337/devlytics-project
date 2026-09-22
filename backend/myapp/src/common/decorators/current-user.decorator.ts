import {
  ExecutionContext,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../types/request-context';

/**
 * Injects the authenticated caller. Passing a key returns that field only —
 * `@CurrentUser('organizationId')` is the standard way to obtain the tenant id.
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('Missing authenticated user');
    }
    return field ? user[field] : user;
  },
);

/** Shorthand for the tenant boundary, which almost every service method needs. */
export const OrganizationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const organizationId = request.user?.organizationId;
    if (!organizationId) {
      throw new UnauthorizedException('Missing organization context');
    }
    return organizationId;
  },
);

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { PermissionKey } from '../common/constants/permissions';
import { AppException } from '../common/exceptions/app.exception';
import type {
  AuthenticatedUser,
  JwtAccessPayload,
} from '../common/types/request-context';
import { UsersRepository } from '../users/users.repository';

/**
 * Resolves the caller on every authenticated request.
 *
 * The organization comes from the signed token, and the membership is
 * re-checked against the database each time, so revoking a role or suspending a
 * member takes effect immediately rather than at token expiry.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtAccessPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'access') {
      throw AppException.unauthorized(
        'A refresh token cannot be used to call the API',
      );
    }

    const membership = await this.users.findMembership(
      payload.organizationId,
      payload.sub,
    );
    if (!membership) {
      throw AppException.unauthorized(
        'You are no longer a member of this organization',
      );
    }
    if (
      membership.status === 'SUSPENDED' ||
      membership.user.status === 'SUSPENDED'
    ) {
      throw AppException.forbidden('This account is suspended');
    }
    if (membership.status === 'REMOVED') {
      throw AppException.unauthorized(
        'You are no longer a member of this organization',
      );
    }

    return {
      userId: membership.userId,
      email: membership.user.email,
      organizationId: membership.organizationId,
      membershipId: membership.id,
      roleId: membership.roleId,
      roleKey: membership.role.key,
      permissions: membership.role.permissions.map(
        (entry) => entry.permission.key as PermissionKey,
      ),
    };
  }
}

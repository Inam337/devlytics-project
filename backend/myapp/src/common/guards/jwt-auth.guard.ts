import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AppException } from '../exceptions/app.exception';
import { ErrorCode } from '../constants/error-codes';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global authentication gate. Routes opt out with `@Public()`; everything else
 * requires a valid access token, so no controller repeats an auth check.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic ? true : super.canActivate(context);
  }

  handleRequest<TUser>(err: unknown, user: TUser, info: unknown): TUser {
    if (err || !user) {
      const reason = (info as Error | undefined)?.name;
      if (reason === 'TokenExpiredError') {
        throw new AppException(
          'Access token has expired',
          ErrorCode.TOKEN_EXPIRED,
          401,
        );
      }
      throw AppException.unauthorized('Missing or invalid access token');
    }
    return user;
  }
}

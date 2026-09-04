import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: { userId?: number } }>();
    const raw = request.user?.userId;
    const id = typeof raw === 'string' ? parseInt(raw, 10) : raw;
    if (id == null || Number.isNaN(id)) {
      throw new UnauthorizedException('Missing authenticated user');
    }
    return id;
  },
);

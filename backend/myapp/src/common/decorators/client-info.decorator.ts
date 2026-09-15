import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

export interface ClientInfo {
  ipAddress: string;
  userAgent: string;
}

/** IP address and user agent, required on every audit log entry and token record. */
export const Client = createParamDecorator((_data: unknown, ctx: ExecutionContext): ClientInfo => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const forwarded = request.headers['x-forwarded-for'];
  const ipAddress =
    (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim()) ||
    request.ip ||
    request.socket?.remoteAddress ||
    'unknown';

  return {
    ipAddress: ipAddress.slice(0, 64),
    userAgent: String(request.headers['user-agent'] ?? 'unknown').slice(0, 255),
  };
});

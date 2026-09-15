import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { PaginatedResult, PaginationMeta } from '../dto/pagination.dto';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  pagination?: PaginationMeta;
  message: string;
}

const DEFAULT_MESSAGE = 'Request completed successfully';

/**
 * Applies the documented success envelope to every controller return value so
 * no handler formats a response by hand.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<unknown>> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessResponse<unknown>> {
    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? DEFAULT_MESSAGE;

    return next.handle().pipe(
      map((payload) => {
        if (payload instanceof PaginatedResult) {
          return {
            success: true as const,
            data: payload.items,
            pagination: payload.pagination,
            message,
          };
        }
        return { success: true as const, data: payload ?? null, message };
      }),
    );
  }
}

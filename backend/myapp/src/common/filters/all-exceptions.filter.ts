import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { ErrorCode } from '../constants/error-codes';
import { AppExceptionBody } from '../exceptions/app.exception';

export interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
  statusCode: number;
  details?: unknown;
  path?: string;
  timestamp: string;
}

interface NormalizedError {
  status: number;
  message: string;
  code: string;
  details?: unknown;
}

/**
 * The only place an error becomes an HTTP response. Prisma errors are mapped to
 * their HTTP equivalents here so no service has to catch database errors just to
 * translate them.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const normalized = this.normalize(exception);

    if (normalized.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${normalized.status} ${normalized.code}: ${normalized.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} -> ${normalized.status} ${normalized.code}: ${normalized.message}`,
      );
    }

    const body: ApiErrorResponse = {
      success: false,
      message: normalized.message,
      code: normalized.code,
      statusCode: normalized.status,
      ...(normalized.details ? { details: normalized.details } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(normalized.status).json(body);
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrismaKnownError(exception);
    }
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'The request could not be applied to the database schema',
        code: ErrorCode.VALIDATION_FAILED,
      };
    }
    if (
      exception instanceof Prisma.PrismaClientInitializationError ||
      exception instanceof Prisma.PrismaClientRustPanicError
    ) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database is unavailable',
        code: ErrorCode.DATABASE_ERROR,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      code: ErrorCode.INTERNAL_ERROR,
    };
  }

  private fromHttpException(exception: HttpException): NormalizedError {
    const status = exception.getStatus();
    const payload = exception.getResponse();

    if (typeof payload === 'string') {
      return { status, message: payload, code: this.codeForStatus(status) };
    }

    const record = payload as Partial<AppExceptionBody> & {
      message?: string | string[];
      error?: string;
    };

    // class-validator returns `message` as an array of constraint failures.
    if (Array.isArray(record.message)) {
      return {
        status,
        message: 'Request validation failed',
        code: ErrorCode.VALIDATION_FAILED,
        details: record.message,
      };
    }

    return {
      status,
      message: record.message ?? record.error ?? 'Request failed',
      code: record.code ?? this.codeForStatus(status),
      details: record.details,
    };
  }

  private fromPrismaKnownError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): NormalizedError {
    const target = (exception.meta?.target as string[] | string | undefined) ?? [];
    const fields = Array.isArray(target) ? target.join(', ') : String(target);

    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: fields
            ? `A record with this ${fields} already exists`
            : 'A record with these values already exists',
          code: ErrorCode.DUPLICATE_RESOURCE,
        };
      case 'P2003':
        return {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          message: 'A referenced record does not exist',
          code: ErrorCode.FOREIGN_KEY_VIOLATION,
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'The requested record was not found',
          code: ErrorCode.NOT_FOUND,
        };
      default:
        return {
          status: HttpStatus.BAD_REQUEST,
          message: `Database request failed (${exception.code})`,
          code: ErrorCode.DATABASE_ERROR,
        };
    }
  }

  private codeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_FAILED;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorCode.UNPROCESSABLE;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMITED;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }
}

import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, conflictCode, notFoundCode } from '../constants/error-codes';

export interface AppExceptionBody {
  message: string;
  code: string;
  details?: unknown;
}

/**
 * The single exception type domain code throws. It carries a stable error code
 * alongside the HTTP status so the exception filter never has to guess one.
 */
export class AppException extends HttpException {
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, code: string, status: HttpStatus, details?: unknown) {
    super({ message, code, details } satisfies AppExceptionBody, status);
    this.code = code;
    this.details = details;
  }

  static notFound(resource: string, identifier?: string): AppException {
    return new AppException(
      identifier ? `${resource} '${identifier}' not found` : `${resource} not found`,
      notFoundCode(resource),
      HttpStatus.NOT_FOUND,
    );
  }

  static duplicate(resource: string, field?: string): AppException {
    return new AppException(
      field ? `${resource} with this ${field} already exists` : `${resource} already exists`,
      conflictCode(resource),
      HttpStatus.CONFLICT,
    );
  }

  static forbidden(message = 'You do not have permission to perform this action'): AppException {
    return new AppException(message, ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN);
  }

  static unauthorized(message = 'Authentication required'): AppException {
    return new AppException(message, ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
  }

  static unprocessable(message: string, code: string = ErrorCode.UNPROCESSABLE): AppException {
    return new AppException(message, code, HttpStatus.UNPROCESSABLE_ENTITY);
  }

  static badRequest(message: string, code: string = ErrorCode.VALIDATION_FAILED): AppException {
    return new AppException(message, code, HttpStatus.BAD_REQUEST);
  }

  static conflict(message: string, code: string = ErrorCode.CONFLICT): AppException {
    return new AppException(message, code, HttpStatus.CONFLICT);
  }
}

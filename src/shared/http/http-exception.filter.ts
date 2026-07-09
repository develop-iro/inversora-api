import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import type { AppConfigService } from '../config/config.service';

type ErrorResponseBody = {
  statusCode: number;
  message: string | string[];
  error?: string;
  path?: string;
  issues?: unknown;
  context?: string;
};

/**
 * Normalizes HTTP exceptions and suppresses sensitive details in production.
 */
@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  constructor(private readonly config: AppConfigService) {}

  /**
   * Maps thrown errors to a safe HTTP response payload.
   *
   * @param exception - Thrown error instance.
   * @param host - Nest execution context host.
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const isProductionDeployment = this.config.isProductionDeployment;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const body = this.buildHttpExceptionBody(
        status,
        exceptionResponse,
        request.path,
        isProductionDeployment,
      );

      if (Number(status) >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
        this.logger.error(
          `${request.method} ${request.path} -> ${status}`,
          isProductionDeployment ? undefined : exception.stack,
        );
      }

      response.status(status).json(body);
      return;
    }

    this.logger.error(
      `${request.method} ${request.path} -> 500`,
      isProductionDeployment ? undefined : String(exception),
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: isProductionDeployment
        ? 'Internal server error'
        : 'Unhandled server error',
      path: request.path,
    } satisfies ErrorResponseBody);
  }

  private buildHttpExceptionBody(
    status: number,
    exceptionResponse: string | object,
    path: string,
    isProductionDeployment: boolean,
  ): ErrorResponseBody {
    if (typeof exceptionResponse === 'string') {
      return {
        statusCode: status,
        message: exceptionResponse,
        path,
      };
    }

    const payload = exceptionResponse as Record<string, unknown>;
    const message = payload.message;

    if (isProductionDeployment) {
      return {
        statusCode: status,
        message:
          typeof message === 'string'
            ? message
            : Array.isArray(message)
              ? message.map(String)
              : 'Request failed',
        path,
      };
    }

    return {
      statusCode: status,
      message:
        typeof message === 'string'
          ? message
          : Array.isArray(message)
            ? message.map(String)
            : 'Request failed',
      error: typeof payload.error === 'string' ? payload.error : undefined,
      issues: payload.issues,
      context:
        typeof payload.context === 'string' ? payload.context : undefined,
      path,
    };
  }
}

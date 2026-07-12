import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodError, treeifyError } from 'zod';

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

    if (exception instanceof ZodError) {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid request payload',
        path: request.path,
        ...(isProductionDeployment ? {} : { issues: treeifyError(exception) }),
      } satisfies ErrorResponseBody);
      return;
    }

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

    const externalStatus = this.getExternalErrorStatus(exception);
    if (externalStatus !== null) {
      response.status(externalStatus).json({
        statusCode: externalStatus,
        message:
          externalStatus === Number(HttpStatus.PAYLOAD_TOO_LARGE)
            ? 'Request body is too large'
            : 'Request failed',
        path: request.path,
      } satisfies ErrorResponseBody);
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

  private getExternalErrorStatus(exception: unknown): number | null {
    if (typeof exception !== 'object' || exception === null) {
      return null;
    }

    const status =
      'statusCode' in exception
        ? exception.statusCode
        : 'status' in exception
          ? exception.status
          : undefined;

    if (
      typeof status === 'number' &&
      status >= 400 &&
      status < 500 &&
      Number.isInteger(status)
    ) {
      return status;
    }

    return null;
  }
}

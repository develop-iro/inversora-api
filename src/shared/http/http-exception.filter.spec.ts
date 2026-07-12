import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';

import { GlobalHttpExceptionFilter } from './http-exception.filter';

type MockResponse = {
  status: jest.Mock;
  json: jest.Mock<void, [unknown]>;
};

describe('GlobalHttpExceptionFilter', () => {
  it('should hide internal validation details in production deployments', () => {
    const filter = new GlobalHttpExceptionFilter({
      isProductionDeployment: true,
    } as never);
    const response = createMockResponse();
    const host = createHost(response, '/funds');

    filter.catch(
      new HttpException(
        {
          message: 'Response payload failed schema validation',
          context: 'fund-list',
          issues: { field: 'invalid' },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      ),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message: 'Response payload failed schema validation',
      path: '/funds',
    });
  });

  it('should preserve diagnostic details outside production deployments', () => {
    const filter = new GlobalHttpExceptionFilter({
      isProductionDeployment: false,
    } as never);
    const response = createMockResponse();
    const host = createHost(response, '/funds');

    filter.catch(
      new HttpException(
        {
          message: 'Response payload failed schema validation',
          context: 'fund-list',
          issues: { field: 'invalid' },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      ),
      host,
    );

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        issues: { field: 'invalid' },
        context: 'fund-list',
      }),
    );
  });

  it('should map string HttpException payloads', () => {
    const filter = new GlobalHttpExceptionFilter({
      isProductionDeployment: true,
    } as never);
    const response = createMockResponse();
    const host = createHost(response, '/health');

    filter.catch(
      new HttpException('Service unavailable', HttpStatus.SERVICE_UNAVAILABLE),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.SERVICE_UNAVAILABLE,
    );
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'Service unavailable',
      path: '/health',
    });
  });

  it('should map Zod validation errors to bad request responses', () => {
    const filter = new GlobalHttpExceptionFilter({
      isProductionDeployment: false,
    } as never);
    const response = createMockResponse();
    const host = createHost(response, '/analytics/events');

    const parsed = z.object({ event: z.string() }).safeParse({});
    if (parsed.success) {
      throw new Error('Expected fixture to fail validation');
    }

    filter.catch(parsed.error, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid request payload',
        path: '/analytics/events',
      }),
    );
    const payload = response.json.mock.calls[0]?.[0] as { issues?: unknown };
    expect(payload?.issues).toBeDefined();
  });

  it('should hide Zod issue details in production deployments', () => {
    const filter = new GlobalHttpExceptionFilter({
      isProductionDeployment: true,
    } as never);
    const response = createMockResponse();
    const host = createHost(response, '/analytics/events');

    const parsed = z.object({ event: z.string() }).safeParse({});
    if (parsed.success) {
      throw new Error('Expected fixture to fail validation');
    }

    filter.catch(parsed.error, host);

    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Invalid request payload',
      path: '/analytics/events',
    });
  });

  it('should normalize array validation messages in production', () => {
    const filter = new GlobalHttpExceptionFilter({
      isProductionDeployment: true,
    } as never);
    const response = createMockResponse();
    const host = createHost(response, '/funds');

    filter.catch(
      new HttpException(
        { message: ['isin must be valid', 'limit must be positive'] },
        HttpStatus.BAD_REQUEST,
      ),
      host,
    );

    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: ['isin must be valid', 'limit must be positive'],
      path: '/funds',
    });
  });

  it('should log server errors for HttpException responses', () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const filter = new GlobalHttpExceptionFilter({
      isProductionDeployment: false,
    } as never);
    const response = createMockResponse();
    const host = createHost(response, '/assistant');

    filter.catch(
      new HttpException('Upstream failed', HttpStatus.BAD_GATEWAY),
      host,
    );

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('should hide unhandled errors in production deployments', () => {
    const filter = new GlobalHttpExceptionFilter({
      isProductionDeployment: true,
    } as never);
    const response = createMockResponse();
    const host = createHost(response, '/funds');

    filter.catch(new Error('database timeout'), host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      path: '/funds',
    });
  });

  it('should preserve safe client error status from middleware errors', () => {
    const filter = new GlobalHttpExceptionFilter({
      isProductionDeployment: true,
    } as never);
    const response = createMockResponse();
    const host = createHost(response, '/analytics/events');

    filter.catch({ statusCode: 413, type: 'entity.too.large' }, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      message: 'Request body is too large',
      path: '/analytics/events',
    });
  });

  it('should preserve non-payload client status from middleware errors', () => {
    const filter = new GlobalHttpExceptionFilter({
      isProductionDeployment: true,
    } as never);
    const response = createMockResponse();
    const host = createHost(response, '/analytics/events');

    filter.catch({ status: 400, type: 'entity.parse.failed' }, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Request failed',
      path: '/analytics/events',
    });
  });

  it('should handle primitive thrown values as internal errors', () => {
    const filter = new GlobalHttpExceptionFilter({
      isProductionDeployment: false,
    } as never);
    const response = createMockResponse();
    const host = createHost(response, '/funds');

    filter.catch('boom', host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Unhandled server error',
      path: '/funds',
    });
  });

  it('should expose unhandled errors outside production deployments', () => {
    const filter = new GlobalHttpExceptionFilter({
      isProductionDeployment: false,
    } as never);
    const response = createMockResponse();
    const host = createHost(response, '/funds');

    filter.catch(new Error('database timeout'), host);

    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Unhandled server error',
      path: '/funds',
    });
  });

  it('should fall back to a generic message when HttpException payloads omit message', () => {
    const filter = new GlobalHttpExceptionFilter({
      isProductionDeployment: true,
    } as never);
    const response = createMockResponse();
    const host = createHost(response, '/funds');

    filter.catch(
      new HttpException({ error: 'Bad Request' }, HttpStatus.BAD_REQUEST),
      host,
    );

    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Request failed',
      path: '/funds',
    });
  });

  it('should include optional error metadata outside production deployments', () => {
    const filter = new GlobalHttpExceptionFilter({
      isProductionDeployment: false,
    } as never);
    const response = createMockResponse();
    const host = createHost(response, '/funds');

    filter.catch(
      new HttpException(
        {
          message: 'Invalid payload',
          error: 'Bad Request',
          context: 'fund-list',
        },
        HttpStatus.BAD_REQUEST,
      ),
      host,
    );

    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Invalid payload',
      error: 'Bad Request',
      context: 'fund-list',
      issues: undefined,
      path: '/funds',
    });
  });

  it('should normalize array messages outside production without optional context', () => {
    const filter = new GlobalHttpExceptionFilter({
      isProductionDeployment: false,
    } as never);
    const response = createMockResponse();
    const host = createHost(response, '/funds');

    filter.catch(
      new HttpException(
        { message: ['isin must be valid'], context: 123 },
        HttpStatus.BAD_REQUEST,
      ),
      host,
    );

    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: ['isin must be valid'],
      error: undefined,
      context: undefined,
      issues: undefined,
      path: '/funds',
    });
  });
});

function createMockResponse(): MockResponse {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn<void, [unknown]>(),
  };
}

function createHost(response: MockResponse, path: string): ArgumentsHost {
  const request = {
    method: 'GET',
    path,
  } as Request;

  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as ArgumentsHost;
}

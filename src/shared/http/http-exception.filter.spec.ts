import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { Request } from 'express';

import { GlobalHttpExceptionFilter } from './http-exception.filter';

type MockResponse = {
  status: jest.Mock;
  json: jest.Mock;
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
});

function createMockResponse(): MockResponse {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
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

import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosError, type AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { AppConfigService } from '../config/config.service';
import { ExternalHttpError } from './external-http.error';
import { HttpClientService } from './http-client.service';

describe('HttpClientService', () => {
  let service: HttpClientService;
  let httpService: { request: jest.Mock };

  const configMock: Pick<
    AppConfigService,
    'httpClientTimeoutMs' | 'httpClientMaxRetries' | 'httpClientRetryDelayMs'
  > = {
    httpClientTimeoutMs: 1_000,
    httpClientMaxRetries: 2,
    httpClientRetryDelayMs: 10,
  };

  beforeEach(async () => {
    httpService = {
      request: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpClientService,
        {
          provide: HttpService,
          useValue: httpService,
        },
        {
          provide: AppConfigService,
          useValue: configMock,
        },
      ],
    }).compile();

    service = module.get<HttpClientService>(HttpClientService);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return a successful GET response', async () => {
    const axiosResponse: AxiosResponse<{ status: string }> = {
      data: { status: 'ok' },
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json', 'x-multi': ['a', 'b'] },
      config: { headers: {} } as AxiosResponse['config'],
    };

    httpService.request.mockReturnValue(of(axiosResponse));

    await expect(
      service.get<{ status: string }>('https://api.example.com/health', {
        provider: 'example',
      }),
    ).resolves.toEqual({
      data: { status: 'ok' },
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-multi': 'a, b',
      },
    });
  });

  it('should send POST requests with a request body', async () => {
    const axiosResponse: AxiosResponse<{ created: boolean }> = {
      data: { created: true },
      status: 201,
      statusText: 'Created',
      headers: {},
      config: { headers: {} } as AxiosResponse['config'],
    };

    httpService.request.mockReturnValue(of(axiosResponse));

    await expect(
      service.post<{ created: boolean }>(
        'https://api.example.com/items',
        { name: 'SPY' },
        { provider: 'example' },
      ),
    ).resolves.toEqual({
      data: { created: true },
      status: 201,
      headers: {},
    });
  });

  it('should retry retryable failures and eventually succeed', async () => {
    const axiosResponse: AxiosResponse<{ ok: boolean }> = {
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: {} } as AxiosResponse['config'],
    };

    httpService.request
      .mockReturnValueOnce(
        of({
          data: {},
          status: 503,
          statusText: 'Service Unavailable',
          headers: {},
          config: { headers: {} } as AxiosResponse['config'],
        }),
      )
      .mockReturnValueOnce(of(axiosResponse));

    await expect(
      service.get<{ ok: boolean }>('https://api.example.com/data'),
    ).resolves.toEqual({
      data: { ok: true },
      status: 200,
      headers: {},
    });

    expect(httpService.request).toHaveBeenCalledTimes(2);
  });

  it('should throw ExternalHttpError after exhausting retries', async () => {
    httpService.request.mockReturnValue(
      of({
        data: {},
        status: 503,
        statusText: 'Service Unavailable',
        headers: {},
        config: { headers: {} } as AxiosResponse['config'],
      }),
    );

    await expect(
      service.get('https://api.example.com/data', { retries: 1 }),
    ).rejects.toMatchObject({
      name: 'ExternalHttpError',
      statusCode: 503,
      isRetryable: true,
    });

    expect(httpService.request).toHaveBeenCalledTimes(2);
  });

  it('should not retry non-retryable client errors', async () => {
    httpService.request.mockReturnValue(
      of({
        data: { message: 'bad request' },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: { headers: {} } as AxiosResponse['config'],
      }),
    );

    await expect(
      service.get('https://api.example.com/data'),
    ).rejects.toBeInstanceOf(ExternalHttpError);

    expect(httpService.request).toHaveBeenCalledTimes(1);
  });

  it('should map timeout errors to ExternalHttpError', async () => {
    const timeoutError = new AxiosError(
      'timeout of 1000ms exceeded',
      'ECONNABORTED',
      { headers: {} } as AxiosError['config'],
    );

    httpService.request.mockReturnValue(throwError(() => timeoutError));

    await expect(
      service.get('https://api.example.com/data', { retries: 0 }),
    ).rejects.toMatchObject({
      name: 'ExternalHttpError',
      isRetryable: true,
      message: expect.stringContaining('timed out after 1000ms'),
    });
  });

  it('should map ETIMEDOUT axios errors to ExternalHttpError', async () => {
    const timeoutError = new AxiosError(
      'connect ETIMEDOUT',
      'ETIMEDOUT',
      { headers: {} } as AxiosError['config'],
    );

    httpService.request.mockReturnValue(throwError(() => timeoutError));

    await expect(
      service.get('https://api.example.com/data', { retries: 0 }),
    ).rejects.toMatchObject({
      name: 'ExternalHttpError',
      isRetryable: true,
      message: expect.stringContaining('timed out after 1000ms'),
    });
  });

  it('should include provider name in status error messages', async () => {
    httpService.request.mockReturnValue(
      of({
        data: { message: 'not found' },
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: { headers: {} } as AxiosResponse['config'],
      }),
    );

    await expect(
      service.get('https://api.example.com/data', {
        provider: 'financial-modeling-prep',
        retries: 0,
      }),
    ).rejects.toMatchObject({
      message: expect.stringContaining('[financial-modeling-prep]'),
    });
  });

  it('should map axios response errors with status codes', async () => {
    const axiosError = new AxiosError(
      'Request failed with status code 404',
      'ERR_BAD_REQUEST',
      { headers: {} } as AxiosError['config'],
      undefined,
      {
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: { headers: {} } as AxiosResponse['config'],
        data: {},
      },
    );

    httpService.request.mockReturnValue(throwError(() => axiosError));

    await expect(
      service.get('https://api.example.com/data', { retries: 0 }),
    ).rejects.toMatchObject({
      name: 'ExternalHttpError',
      statusCode: 404,
      isRetryable: false,
    });
  });

  it('should map network errors without a response status', async () => {
    const networkError = new AxiosError(
      'Network Error',
      'ERR_NETWORK',
      { headers: {} } as AxiosError['config'],
    );

    httpService.request.mockReturnValue(throwError(() => networkError));

    await expect(
      service.get('https://api.example.com/data', { retries: 0 }),
    ).rejects.toMatchObject({
      name: 'ExternalHttpError',
      isRetryable: true,
      message: expect.stringContaining('Network Error'),
    });
  });

  it('should map unknown thrown values to ExternalHttpError', async () => {
    httpService.request.mockReturnValue(throwError(() => 'unexpected failure'));

    await expect(
      service.request('GET', 'https://api.example.com/data', undefined, {
        retries: 0,
      }),
    ).rejects.toMatchObject({
      name: 'ExternalHttpError',
      message: expect.stringContaining('unexpected failure'),
    });
  });

  it('should retry rate-limited responses', async () => {
    const axiosResponse: AxiosResponse<{ ok: boolean }> = {
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: {} } as AxiosResponse['config'],
    };

    httpService.request
      .mockReturnValueOnce(
        of({
          data: {},
          status: 429,
          statusText: 'Too Many Requests',
          headers: {},
          config: { headers: {} } as AxiosResponse['config'],
        }),
      )
      .mockReturnValueOnce(of(axiosResponse));

    await expect(service.get('https://api.example.com/data')).resolves.toEqual({
      data: { ok: true },
      status: 200,
      headers: {},
    });
  });

  it('should retry axios errors that include retryable status codes', async () => {
    const axiosError503 = new AxiosError(
      'Request failed with status code 503',
      'ERR_BAD_RESPONSE',
      { headers: {} } as AxiosError['config'],
      undefined,
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {},
        config: { headers: {} } as AxiosResponse['config'],
        data: {},
      },
    );
    const axiosResponse: AxiosResponse<{ ok: boolean }> = {
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: { 'x-test': undefined as unknown as string },
      config: { headers: {} } as AxiosResponse['config'],
    };

    httpService.request
      .mockReturnValueOnce(throwError(() => axiosError503))
      .mockReturnValueOnce(of(axiosResponse));

    await expect(service.get('https://api.example.com/data')).resolves.toEqual({
      data: { ok: true },
      status: 200,
      headers: {},
    });
  });
});

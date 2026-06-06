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
      headers: { 'content-type': 'application/json' },
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
      headers: { 'content-type': 'application/json' },
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

    let caughtError: unknown;

    try {
      await service.get('https://api.example.com/data', { retries: 0 });
    } catch (error: unknown) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(ExternalHttpError);
    expect((caughtError as ExternalHttpError).isRetryable).toBe(true);
    expect((caughtError as ExternalHttpError).message).toContain(
      'timed out after 1000ms',
    );
  });
});

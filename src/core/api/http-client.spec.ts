import { BadGatewayException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ExternalHttpError } from '../../shared/http/external-http.error';
import { HttpClientService } from '../../shared/http/http-client.service';
import { CoreApiHttpClient } from './http-client';

describe('CoreApiHttpClient', () => {
  let client: CoreApiHttpClient;
  let httpClient: { request: jest.Mock };

  beforeEach(async () => {
    httpClient = {
      request: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoreApiHttpClient,
        {
          provide: HttpClientService,
          useValue: httpClient,
        },
      ],
    }).compile();

    client = module.get(CoreApiHttpClient);
  });

  it('should return successful GET responses from the shared HTTP client', async () => {
    httpClient.request.mockResolvedValue({
      data: { ok: true },
      status: 200,
      headers: {},
    });

    await expect(
      client.get<{ ok: boolean }>('https://api.example.com/data'),
    ).resolves.toEqual({
      data: { ok: true },
      status: 200,
      headers: {},
    });

    expect(httpClient.request).toHaveBeenCalledWith(
      'GET',
      'https://api.example.com/data',
      undefined,
      undefined,
    );
  });

  it('should map ExternalHttpError to BadGatewayException', async () => {
    httpClient.request.mockRejectedValue(
      new ExternalHttpError({
        message: 'Provider unavailable',
        statusCode: 503,
        provider: 'example',
        isRetryable: true,
      }),
    );

    await expect(
      client.request('GET', 'https://api.example.com/data', undefined, {
        provider: 'example',
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);

    await expect(
      client.request('GET', 'https://api.example.com/data', undefined, {
        provider: 'example',
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Provider unavailable',
        provider: 'example',
        statusCode: 503,
      },
    });
  });

  it('should map generic errors to BadGatewayException', async () => {
    httpClient.request.mockRejectedValue(new Error('Network failure'));

    await expect(
      client.get('https://api.example.com/data'),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('should send POST requests through the shared HTTP client', async () => {
    httpClient.request.mockResolvedValue({
      data: { created: true },
      status: 201,
      headers: {},
    });

    await expect(
      client.post<{ created: boolean }>(
        'https://api.example.com/data',
        { name: 'fund' },
        { provider: 'example' },
      ),
    ).resolves.toEqual({
      data: { created: true },
      status: 201,
      headers: {},
    });

    expect(httpClient.request).toHaveBeenCalledWith(
      'POST',
      'https://api.example.com/data',
      { name: 'fund' },
      { provider: 'example' },
    );
  });

  it('should map non-error failures to InternalServerErrorException', async () => {
    httpClient.request.mockRejectedValue('unexpected');

    await expect(
      client.get('https://api.example.com/data'),
    ).rejects.toMatchObject({
      response: {
        message: 'Unexpected outbound HTTP client failure',
      },
    });
  });
});

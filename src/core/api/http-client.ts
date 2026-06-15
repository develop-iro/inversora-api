import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpClientService } from '../../shared/http/http-client.service';
import { ExternalHttpError } from '../../shared/http/external-http.error';
import type {
  HttpClientRequestOptions,
  HttpClientResponse,
  HttpMethod,
} from '../../shared/http/http-client.types';

/**
 * Outbound HTTP client for external providers with standardized API error mapping.
 */
@Injectable()
export class CoreApiHttpClient {
  constructor(private readonly httpClient: HttpClientService) {}

  /**
   * Sends an HTTP GET request to an external provider.
   *
   * @param url - Absolute or relative request URL.
   * @param options - Per-request client options.
   * @returns Normalized HTTP response.
   */
  async get<T>(
    url: string,
    options?: HttpClientRequestOptions,
  ): Promise<HttpClientResponse<T>> {
    return this.request<T>('GET', url, undefined, options);
  }

  /**
   * Sends an HTTP POST request to an external provider.
   *
   * @param url - Absolute or relative request URL.
   * @param body - Request payload.
   * @param options - Per-request client options.
   * @returns Normalized HTTP response.
   */
  async post<T>(
    url: string,
    body?: unknown,
    options?: HttpClientRequestOptions,
  ): Promise<HttpClientResponse<T>> {
    return this.request<T>('POST', url, body, options);
  }

  /**
   * Sends an HTTP request and maps provider failures to `BadGatewayException`.
   *
   * @param method - HTTP method.
   * @param url - Absolute or relative request URL.
   * @param body - Optional request payload.
   * @param options - Per-request client options.
   * @returns Normalized HTTP response.
   */
  async request<T>(
    method: HttpMethod,
    url: string,
    body?: unknown,
    options?: HttpClientRequestOptions,
  ): Promise<HttpClientResponse<T>> {
    try {
      return await this.httpClient.request<T>(method, url, body, options);
    } catch (error) {
      throw this.mapOutboundError(error, options?.provider);
    }
  }

  private mapOutboundError(
    error: unknown,
    provider?: string,
  ): BadGatewayException | InternalServerErrorException {
    if (error instanceof ExternalHttpError) {
      throw new BadGatewayException({
        message: error.message,
        provider: error.provider ?? provider,
        statusCode: error.statusCode,
      });
    }

    if (error instanceof Error) {
      throw new BadGatewayException({
        message: error.message,
        provider,
      });
    }

    throw new InternalServerErrorException({
      message: 'Unexpected outbound HTTP client failure',
      provider,
    });
  }
}

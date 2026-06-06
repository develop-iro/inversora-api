import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../config/config.service';
import { ExternalHttpError } from './external-http.error';
import type {
  HttpClientRequestOptions,
  HttpClientResponse,
  HttpMethod,
  ResolvedHttpClientOptions,
} from './http-client.types';

interface RequestContext {
  readonly method: HttpMethod;
  readonly url: string;
  readonly provider?: string;
}

/**
 * Centralized HTTP client for outbound requests to external providers.
 */
@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Sends an HTTP GET request.
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
   * Sends an HTTP POST request.
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
   * Sends an HTTP request with retry, timeout, logging, and error handling.
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
    const resolvedOptions = this.resolveOptions(options);
    const context: RequestContext = {
      method,
      url,
      provider: options?.provider,
    };
    const startedAt = Date.now();

    this.logger.log(this.formatLogMessage('request', context));

    try {
      const response = await this.executeWithRetry(
        () => this.sendRequest<T>(method, url, body, options, resolvedOptions),
        resolvedOptions,
        context,
      );

      this.logger.log(
        this.formatLogMessage('success', context, {
          status: response.status,
          durationMs: Date.now() - startedAt,
        }),
      );

      return response;
    } catch (error: unknown) {
      const externalError = this.mapError(
        error,
        context,
        resolvedOptions.timeout,
      );

      this.logger.error(
        this.formatLogMessage('failure', context, {
          status: externalError.statusCode,
          durationMs: Date.now() - startedAt,
          message: externalError.message,
        }),
      );

      throw externalError;
    }
  }

  private resolveOptions(
    options?: HttpClientRequestOptions,
  ): ResolvedHttpClientOptions {
    return {
      timeout: options?.timeout ?? this.config.httpClientTimeoutMs,
      retries: options?.retries ?? this.config.httpClientMaxRetries,
      retryDelayMs: options?.retryDelayMs ?? this.config.httpClientRetryDelayMs,
    };
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: ResolvedHttpClientOptions,
    context: RequestContext,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= options.retries; attempt += 1) {
      try {
        return await operation();
      } catch (error: unknown) {
        lastError = error;

        if (attempt >= options.retries || !this.isRetryable(error)) {
          throw error;
        }

        const delayMs = options.retryDelayMs * 2 ** attempt;

        this.logger.warn(
          this.formatLogMessage('retry', context, {
            attempt: attempt + 1,
            maxRetries: options.retries,
            delayMs,
            message: this.getErrorMessage(error),
          }),
        );

        await this.sleep(delayMs);
      }
    }

    throw lastError;
  }

  private async sendRequest<T>(
    method: HttpMethod,
    url: string,
    body: unknown,
    options: HttpClientRequestOptions | undefined,
    resolvedOptions: ResolvedHttpClientOptions,
  ): Promise<HttpClientResponse<T>> {
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method,
          url,
          data: body,
          timeout: resolvedOptions.timeout,
          headers: options?.headers,
          params: options?.params,
          validateStatus: () => true,
        }),
      );

      if (response.status >= 400) {
        throw new ExternalHttpError({
          message: this.buildStatusErrorMessage(
            method,
            url,
            response.status,
            options?.provider,
          ),
          statusCode: response.status,
          provider: options?.provider,
          isRetryable: this.isRetryableStatus(response.status),
        });
      }

      return {
        data: response.data,
        status: response.status,
        headers: this.normalizeHeaders(response.headers),
      };
    } catch (error: unknown) {
      if (error instanceof ExternalHttpError) {
        throw error;
      }

      if (isAxiosError(error)) {
        throw this.mapAxiosError(
          error,
          { method, url, provider: options?.provider },
          resolvedOptions.timeout,
        );
      }

      throw error;
    }
  }

  private mapError(
    error: unknown,
    context: RequestContext,
    timeoutMs: number,
  ): ExternalHttpError {
    if (error instanceof ExternalHttpError) {
      return error;
    }

    if (isAxiosError(error)) {
      return this.mapAxiosError(error, context, timeoutMs);
    }

    return new ExternalHttpError({
      message: `HTTP ${context.method} ${context.url} failed: ${this.getErrorMessage(error)}`,
      provider: context.provider,
      cause: error,
    });
  }

  private mapAxiosError(
    error: import('axios').AxiosError,
    context: RequestContext,
    timeoutMs: number,
  ): ExternalHttpError {
    const statusCode = error.response?.status;
    const isTimeout =
      error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';

    if (isTimeout) {
      return new ExternalHttpError({
        message: `HTTP ${context.method} ${context.url} timed out after ${timeoutMs}ms`,
        provider: context.provider,
        isRetryable: true,
        cause: error,
      });
    }

    if (statusCode !== undefined) {
      return new ExternalHttpError({
        message: this.buildStatusErrorMessage(
          context.method,
          context.url,
          statusCode,
          context.provider,
        ),
        statusCode,
        provider: context.provider,
        isRetryable: this.isRetryableStatus(statusCode),
        cause: error,
      });
    }

    return new ExternalHttpError({
      message: `HTTP ${context.method} ${context.url} failed: ${error.message}`,
      provider: context.provider,
      isRetryable: true,
      cause: error,
    });
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof ExternalHttpError) {
      return error.isRetryable;
    }

    if (isAxiosError(error)) {
      if (error.response?.status !== undefined) {
        return this.isRetryableStatus(error.response.status);
      }

      return true;
    }

    return false;
  }

  private isRetryableStatus(statusCode: number): boolean {
    return statusCode >= 500 || statusCode === 429;
  }

  private buildStatusErrorMessage(
    method: HttpMethod,
    url: string,
    statusCode: number,
    provider?: string,
  ): string {
    const providerSuffix = provider ? ` [${provider}]` : '';

    return `HTTP ${method} ${url}${providerSuffix} failed with status ${statusCode}`;
  }

  private formatLogMessage(
    event: 'request' | 'success' | 'retry' | 'failure',
    context: RequestContext,
    details?: Record<string, string | number | undefined>,
  ): string {
    const providerSuffix = context.provider
      ? ` provider=${context.provider}`
      : '';
    const detailSuffix = details
      ? ` ${Object.entries(details)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => `${key}=${String(value)}`)
          .join(' ')}`
      : '';

    return `HTTP ${event} method=${context.method} url=${context.url}${providerSuffix}${detailSuffix}`;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private normalizeHeaders(
    headers: import('axios').AxiosResponse['headers'],
  ): Record<string, string> {
    return Object.entries(headers).reduce<Record<string, string>>(
      (normalized, [key, value]) => {
        if (value === undefined) {
          return normalized;
        }

        normalized[key] = Array.isArray(value)
          ? value.join(', ')
          : String(value);
        return normalized;
      },
      {},
    );
  }

  private sleep(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }
}

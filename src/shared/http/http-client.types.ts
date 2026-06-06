/** Supported HTTP methods for outbound requests. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Query-string parameter value. */
export type HttpQueryParamValue = string | number | boolean | undefined;

/**
 * Per-request options for the centralized HTTP client.
 */
export interface HttpClientRequestOptions {
  /** Request timeout in milliseconds. */
  readonly timeout?: number;

  /** Number of retry attempts after the initial request. */
  readonly retries?: number;

  /** Base delay in milliseconds between retry attempts. */
  readonly retryDelayMs?: number;

  /** Additional request headers. */
  readonly headers?: Record<string, string>;

  /** Query-string parameters. */
  readonly params?: Record<string, HttpQueryParamValue>;

  /** External provider identifier used in logs and errors. */
  readonly provider?: string;
}

/**
 * Normalized response returned by the centralized HTTP client.
 */
export interface HttpClientResponse<T> {
  /** Parsed response body. */
  readonly data: T;

  /** HTTP status code. */
  readonly status: number;

  /** Response headers. */
  readonly headers: Record<string, string>;
}

/**
 * Resolved request options after applying environment defaults.
 */
export interface ResolvedHttpClientOptions {
  readonly timeout: number;
  readonly retries: number;
  readonly retryDelayMs: number;
}

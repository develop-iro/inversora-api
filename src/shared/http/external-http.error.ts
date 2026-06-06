/**
 * Error thrown when an outbound HTTP request to an external provider fails.
 */
export class ExternalHttpError extends Error {
  /** HTTP status code returned by the provider, when available. */
  readonly statusCode?: number;

  /** External provider identifier for observability. */
  readonly provider?: string;

  /** Whether the request failure is eligible for retry. */
  readonly isRetryable: boolean;

  /**
   * @param params - Error details.
   */
  constructor(params: {
    readonly message: string;
    readonly statusCode?: number;
    readonly provider?: string;
    readonly isRetryable?: boolean;
    readonly cause?: unknown;
  }) {
    super(params.message);
    this.name = 'ExternalHttpError';
    this.statusCode = params.statusCode;
    this.provider = params.provider;
    this.isRetryable = params.isRetryable ?? false;

    if (params.cause !== undefined) {
      this.cause = params.cause;
    }
  }
}

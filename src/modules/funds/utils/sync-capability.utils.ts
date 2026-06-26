import { ExternalHttpError } from '../../../shared/http/external-http.error';

/**
 * Returns whether an error represents a paid-plan capability restriction from FMP.
 *
 * @param error - Caught sync error.
 * @returns `true` for HTTP 402/403 provider failures.
 */
export function isPaidPlanCapabilityError(error: unknown): boolean {
  return (
    error instanceof ExternalHttpError &&
    (error.statusCode === 402 || error.statusCode === 403)
  );
}

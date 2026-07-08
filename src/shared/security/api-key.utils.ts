import { timingSafeEqual } from 'node:crypto';

/**
 * Compares API keys in constant time to reduce timing-attack risk.
 *
 * @param provided - Key supplied by the caller.
 * @param configured - Expected key from configuration.
 * @returns Whether both keys match.
 */
export function secureCompareApiKey(
  provided: string | undefined,
  configured: string | undefined,
): boolean {
  if (provided === undefined || configured === undefined) {
    return false;
  }

  const providedBuffer = Buffer.from(provided);
  const configuredBuffer = Buffer.from(configured);

  if (providedBuffer.length !== configuredBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, configuredBuffer);
}

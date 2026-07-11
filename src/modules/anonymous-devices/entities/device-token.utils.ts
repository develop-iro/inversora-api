import { createHash, randomBytes } from 'node:crypto';

const DEVICE_TOKEN_PREFIX = 'dev_';

/**
 * Generates an opaque device token for anonymous mobile installations.
 */
export function generateDeviceToken(): string {
  return `${DEVICE_TOKEN_PREFIX}${randomBytes(32).toString('hex')}`;
}

/**
 * Hashes a device token for secure persistence.
 *
 * @param deviceToken - Plain device token from the client header.
 */
export function hashDeviceToken(deviceToken: string): string {
  return createHash('sha256').update(deviceToken).digest('hex');
}

/**
 * Returns whether a value looks like a supported device token.
 *
 * @param deviceToken - Candidate token from request headers.
 */
export function isDeviceTokenFormatValid(deviceToken: string): boolean {
  return (
    deviceToken.startsWith(DEVICE_TOKEN_PREFIX) && deviceToken.length >= 40
  );
}

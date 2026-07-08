/**
 * Removes sensitive query parameters from URLs before logging.
 *
 * @param url - Absolute or relative request URL.
 */
export function sanitizeUrlForLog(url: string): string {
  try {
    const parsed = new URL(url);
    const sensitiveParams = ['apikey', 'api_key', 'access_token', 'token'];

    for (const param of sensitiveParams) {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '[redacted]');
      }
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

/** Default browser origins for local Expo web during development. */
export const DEFAULT_DEV_CORS_ORIGINS = [
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:19006',
  'http://127.0.0.1:19006',
] as const;

/**
 * Resolves allowed CORS origins from configured values and runtime environment.
 *
 * @param configuredOrigins - Origins from `CORS_ORIGINS`.
 * @param nodeEnv - Application runtime environment.
 * @returns Origins to pass to NestJS `enableCors`.
 */
export function resolveCorsOrigins(
  configuredOrigins: readonly string[],
  nodeEnv: 'development' | 'production' | 'test',
): readonly string[] {
  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  if (nodeEnv === 'development') {
    return DEFAULT_DEV_CORS_ORIGINS;
  }

  return [];
}

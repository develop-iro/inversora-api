import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/** Default browser origins for local Expo web during development. */
export const DEFAULT_DEV_CORS_ORIGINS = [
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:19006',
  'http://127.0.0.1:19006',
] as const;

/** HTTP methods exposed to browser clients (Expo web). */
export const CORS_ALLOWED_METHODS = ['GET', 'HEAD', 'OPTIONS', 'POST'] as const;

/** Request headers allowed on cross-origin browser calls. */
export const CORS_ALLOWED_HEADERS = ['Content-Type', 'Accept'] as const;

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

/**
 * Builds NestJS CORS options for Expo web and other browser clients.
 *
 * Native React Native requests do not use CORS. Credentials stay disabled because
 * the MVP does not rely on cookies or browser sessions.
 *
 * @param origins - Allowed `Origin` header values.
 * @returns Options for `app.enableCors`.
 */
export function buildNestCorsOptions(origins: readonly string[]): CorsOptions {
  return {
    origin: [...origins],
    methods: [...CORS_ALLOWED_METHODS],
    allowedHeaders: [...CORS_ALLOWED_HEADERS],
    credentials: false,
    maxAge: 86_400,
  };
}

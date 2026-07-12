import { applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

function resolvePositiveNumber(
  raw: string | undefined,
  fallback: number,
): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function resolveThrottleTtl(): number {
  return resolvePositiveNumber(process.env.THROTTLE_TTL_SECONDS, 60) * 1_000;
}

/**
 * Applies the dedicated analytics ingestion rate limit.
 */
export function AnalyticsThrottle(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    Throttle({
      analytics: {
        limit: resolvePositiveNumber(process.env.THROTTLE_ANALYTICS_LIMIT, 60),
        ttl: resolveThrottleTtl(),
      },
    }),
  );
}

/**
 * Applies the stricter anonymous device registration rate limit.
 */
export function DeviceRegisterThrottle(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    Throttle({
      'device-register': {
        limit: resolvePositiveNumber(
          process.env.THROTTLE_DEVICE_REGISTER_LIMIT,
          10,
        ),
        ttl: resolveThrottleTtl(),
      },
    }),
  );
}

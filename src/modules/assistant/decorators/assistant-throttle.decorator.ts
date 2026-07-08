import { applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

/**
 * Resolves assistant throttle limits from preloaded environment variables.
 */
function resolveAssistantThrottleLimits(): { limit: number; ttl: number } {
  const ttlSeconds = Number(process.env.THROTTLE_TTL_SECONDS ?? 60);
  const limit = Number(process.env.THROTTLE_ASSISTANT_LIMIT ?? 30);

  return {
    limit: Number.isFinite(limit) && limit > 0 ? limit : 30,
    ttl:
      Number.isFinite(ttlSeconds) && ttlSeconds > 0
        ? ttlSeconds * 1_000
        : 60_000,
  };
}

/**
 * Applies the stricter SORA assistant rate limit to a controller or route.
 */
export function AssistantThrottle(): MethodDecorator & ClassDecorator {
  const { limit, ttl } = resolveAssistantThrottleLimits();

  return applyDecorators(
    Throttle({
      assistant: { limit, ttl },
    }),
  );
}

import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ThrottlerModule } from '@nestjs/throttler';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';

import { AppConfigService } from '../config/config.service';

/**
 * Builds NestJS throttler module options from validated configuration.
 *
 * @param config - Application configuration service.
 */
export function buildThrottlerModuleOptions(
  config: AppConfigService,
): ThrottlerModuleOptions {
  const ttlMs = config.throttleTtlSeconds * 1_000;
  const storage = config.throttleRedisUrl
    ? new ThrottlerStorageRedisService(config.throttleRedisUrl)
    : undefined;

  return {
    throttlers: [
      {
        name: 'default',
        ttl: ttlMs,
        limit: config.throttleLimit,
      },
      {
        name: 'assistant',
        ttl: ttlMs,
        limit: config.throttleAssistantLimit,
      },
    ],
    storage,
  };
}

/**
 * Registers global HTTP rate limiting for the API.
 */
export const AppThrottlerModule = ThrottlerModule.forRootAsync({
  inject: [AppConfigService],
  useFactory: (config: AppConfigService) => buildThrottlerModuleOptions(config),
});

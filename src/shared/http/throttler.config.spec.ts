import { buildThrottlerModuleOptions } from './throttler.config';

describe('buildThrottlerModuleOptions', () => {
  it('should configure default and assistant throttlers from config', () => {
    const options = buildThrottlerModuleOptions({
      throttleTtlSeconds: 60,
      throttleLimit: 120,
      throttleAssistantLimit: 30,
      throttleRedisUrl: undefined,
    } as never);

    expect(options.throttlers).toEqual([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
      {
        name: 'assistant',
        ttl: 60_000,
        limit: 30,
      },
    ]);
    expect(options.storage).toBeUndefined();
  });

  it('should use Redis storage when a Redis URL is configured', () => {
    const options = buildThrottlerModuleOptions({
      throttleTtlSeconds: 60,
      throttleLimit: 120,
      throttleAssistantLimit: 30,
      throttleRedisUrl: 'redis://localhost:6379',
    } as never);

    expect(options.storage).toBeDefined();
  });
});

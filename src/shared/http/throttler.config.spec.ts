import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

import { buildThrottlerModuleOptions } from './throttler.config';

type ResolvedThrottlerModuleOptions = {
  throttlers: Array<{ name: string; ttl: number; limit: number }>;
  storage?: unknown;
};

jest.mock('@nest-lab/throttler-storage-redis', () => ({
  ThrottlerStorageRedisService: jest.fn(),
}));

describe('buildThrottlerModuleOptions', () => {
  beforeEach(() => {
    jest.mocked(ThrottlerStorageRedisService).mockImplementation(
      () =>
        ({
          increment: jest.fn(),
        }) as never,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should configure default and assistant throttlers from config', () => {
    const options = buildThrottlerModuleOptions({
      throttleTtlSeconds: 60,
      throttleLimit: 120,
      throttleAssistantLimit: 30,
      throttleAnalyticsLimit: 60,
      throttleDeviceRegisterLimit: 10,
      throttleRedisUrl: undefined,
    } as never) as ResolvedThrottlerModuleOptions;

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
      {
        name: 'analytics',
        ttl: 60_000,
        limit: 60,
      },
      {
        name: 'device-register',
        ttl: 60_000,
        limit: 10,
      },
    ]);
    expect(options.storage).toBeUndefined();
    expect(ThrottlerStorageRedisService).not.toHaveBeenCalled();
  });

  it('should use Redis storage when a Redis URL is configured', () => {
    const options = buildThrottlerModuleOptions({
      throttleTtlSeconds: 60,
      throttleLimit: 120,
      throttleAssistantLimit: 30,
      throttleAnalyticsLimit: 60,
      throttleDeviceRegisterLimit: 10,
      throttleRedisUrl: 'redis://localhost:6379',
    } as never) as ResolvedThrottlerModuleOptions;

    expect(ThrottlerStorageRedisService).toHaveBeenCalledWith(
      'redis://localhost:6379',
    );
    expect(options.storage).toBeDefined();
  });
});

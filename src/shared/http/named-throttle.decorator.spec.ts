import { Throttle } from '@nestjs/throttler';

import {
  AnalyticsThrottle,
  DeviceRegisterThrottle,
} from './named-throttle.decorator';

jest.mock('@nestjs/throttler', () => ({
  Throttle: jest.fn(() => jest.fn()),
}));

describe('named throttle decorators', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses configured positive limits and ttl values', () => {
    process.env.THROTTLE_TTL_SECONDS = '30';
    process.env.THROTTLE_ANALYTICS_LIMIT = '25';
    process.env.THROTTLE_DEVICE_REGISTER_LIMIT = '5';

    AnalyticsThrottle();
    DeviceRegisterThrottle();

    expect(Throttle).toHaveBeenNthCalledWith(1, {
      analytics: {
        limit: 25,
        ttl: 30_000,
      },
    });
    expect(Throttle).toHaveBeenNthCalledWith(2, {
      'device-register': {
        limit: 5,
        ttl: 30_000,
      },
    });
  });

  it('falls back when env values are missing or invalid', () => {
    process.env.THROTTLE_TTL_SECONDS = '0';
    process.env.THROTTLE_ANALYTICS_LIMIT = 'not-a-number';
    delete process.env.THROTTLE_DEVICE_REGISTER_LIMIT;

    AnalyticsThrottle();
    DeviceRegisterThrottle();

    expect(Throttle).toHaveBeenNthCalledWith(1, {
      analytics: {
        limit: 60,
        ttl: 60_000,
      },
    });
    expect(Throttle).toHaveBeenNthCalledWith(2, {
      'device-register': {
        limit: 10,
        ttl: 60_000,
      },
    });
  });
});

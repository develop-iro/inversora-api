import { HttpException, HttpStatus } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { AssistantRateLimitGuard } from './assistant-rate-limit.guard';

describe('AssistantRateLimitGuard', () => {
  it('allows requests below the configured limit', () => {
    const guard = createGuard({ maxRequests: 2, windowSeconds: 60 });

    expect(guard.canActivate(createContext({ ip: '127.0.0.1' }))).toBe(true);
    expect(guard.canActivate(createContext({ ip: '127.0.0.1' }))).toBe(true);
  });

  it('rejects requests above the configured limit', () => {
    const guard = createGuard({ maxRequests: 1, windowSeconds: 60 });

    expect(guard.canActivate(createContext({ ip: '127.0.0.1' }))).toBe(true);
    try {
      guard.canActivate(createContext({ ip: '127.0.0.1' }));
      throw new Error('Expected rate limit rejection');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  });

  it('uses x-sora-client-id before ip when present', () => {
    const guard = createGuard({ maxRequests: 1, windowSeconds: 60 });

    expect(
      guard.canActivate(
        createContext({
          ip: '127.0.0.1',
          headers: { 'x-sora-client-id': 'device-a' },
        }),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        createContext({
          ip: '127.0.0.1',
          headers: { 'x-sora-client-id': 'device-b' },
        }),
      ),
    ).toBe(true);
  });

  it('uses x-forwarded-for when client id is blank', () => {
    const guard = createGuard({ maxRequests: 1, windowSeconds: 60 });

    expect(
      guard.canActivate(
        createContext({
          ip: '127.0.0.1',
          headers: {
            'x-sora-client-id': '   ',
            'x-forwarded-for': '203.0.113.10, 10.0.0.1',
          },
        }),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        createContext({
          ip: '127.0.0.1',
          headers: { 'x-forwarded-for': '203.0.113.11' },
        }),
      ),
    ).toBe(true);
  });

  it('resets the bucket after the window expires', () => {
    jest.useFakeTimers();
    try {
      const guard = createGuard({ maxRequests: 1, windowSeconds: 1 });

      expect(guard.canActivate(createContext({ ip: '127.0.0.1' }))).toBe(true);
      expect(() =>
        guard.canActivate(createContext({ ip: '127.0.0.1' })),
      ).toThrow(HttpException);

      jest.advanceTimersByTime(1_100);

      expect(guard.canActivate(createContext({ ip: '127.0.0.1' }))).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('prunes expired buckets when the in-memory map grows large', () => {
    jest.useFakeTimers();
    try {
      const guard = createGuard({ maxRequests: 5, windowSeconds: 60 });
      const buckets = (
        guard as unknown as {
          buckets: Map<string, { count: number; resetAt: number }>;
        }
      ).buckets;
      const now = Date.now();

      for (let index = 0; index < 1_000; index += 1) {
        buckets.set(`client:device-${index}`, {
          count: 1,
          resetAt: now - 1,
        });
      }

      expect(guard.canActivate(createContext({ ip: '127.0.0.1' }))).toBe(true);
      expect(buckets.size).toBeLessThan(1_000);
    } finally {
      jest.useRealTimers();
    }
  });
});

function createGuard(config: {
  maxRequests: number;
  windowSeconds: number;
}): AssistantRateLimitGuard {
  return new AssistantRateLimitGuard({
    assistantRateLimitMaxRequests: config.maxRequests,
    assistantRateLimitWindowSeconds: config.windowSeconds,
  } as never);
}

function createContext(input: {
  ip: string;
  headers?: Record<string, string>;
}): ExecutionContext {
  const headers = input.headers ?? {};
  const request = {
    ip: input.ip,
    header: (name: string) => headers[name.toLowerCase()],
  } as Request;

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

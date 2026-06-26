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

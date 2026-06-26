import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { AssistantInternalApiKeyGuard } from './assistant-internal-api-key.guard';

describe('AssistantInternalApiKeyGuard', () => {
  it('allows requests with the configured internal key', () => {
    const guard = new AssistantInternalApiKeyGuard({
      assistantInternalApiKey: 'test-sora-key',
    } as never);

    expect(
      guard.canActivate(
        createContext({ 'x-sora-internal-api-key': 'test-sora-key' }),
      ),
    ).toBe(true);
  });

  it('allows bearer auth', () => {
    const guard = new AssistantInternalApiKeyGuard({
      assistantInternalApiKey: 'test-sora-key',
    } as never);

    expect(
      guard.canActivate(
        createContext({ authorization: 'Bearer test-sora-key' }),
      ),
    ).toBe(true);
  });

  it('rejects missing or invalid keys', () => {
    const guard = new AssistantInternalApiKeyGuard({
      assistantInternalApiKey: 'test-sora-key',
    } as never);

    expect(() => guard.canActivate(createContext({}))).toThrow(
      UnauthorizedException,
    );
    expect(() =>
      guard.canActivate(createContext({ 'x-sora-internal-api-key': 'wrong' })),
    ).toThrow(UnauthorizedException);
    expect(() =>
      guard.canActivate(
        createContext({ authorization: 'Basic test-sora-key' }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('rejects requests when internal auth is not configured', () => {
    const guard = new AssistantInternalApiKeyGuard({
      assistantInternalApiKey: undefined,
    } as never);

    expect(() =>
      guard.canActivate(createContext({ 'x-sora-internal-api-key': 'any' })),
    ).toThrow(UnauthorizedException);
  });
});

function createContext(headers: Record<string, string>): ExecutionContext {
  const request = {
    header: (name: string) => headers[name.toLowerCase()],
  } as Request;

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

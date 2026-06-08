import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AdminApiKeyGuard } from './admin-api-key.guard';

describe('AdminApiKeyGuard', () => {
  const createContext = (headers: Record<string, string>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          header: (name: string) => headers[name.toLowerCase()],
        }),
      }),
    }) as ExecutionContext;

  it('should reject requests when admin sync is disabled', () => {
    const guard = new AdminApiKeyGuard({
      adminSyncEnabled: false,
      adminApiKey: 'test-admin-key',
    } as never);

    expect(() =>
      guard.canActivate(createContext({ 'x-admin-api-key': 'test-admin-key' })),
    ).toThrow(NotFoundException);
  });

  it('should reject requests without a configured admin key', () => {
    const guard = new AdminApiKeyGuard({
      adminSyncEnabled: true,
      adminApiKey: undefined,
    } as never);

    expect(() =>
      guard.canActivate(createContext({ 'x-admin-api-key': 'test-admin-key' })),
    ).toThrow(UnauthorizedException);
  });

  it('should accept a valid X-Admin-Api-Key header', () => {
    const guard = new AdminApiKeyGuard({
      adminSyncEnabled: true,
      adminApiKey: 'test-admin-key',
    } as never);

    expect(
      guard.canActivate(createContext({ 'x-admin-api-key': 'test-admin-key' })),
    ).toBe(true);
  });

  it('should accept a valid Bearer token', () => {
    const guard = new AdminApiKeyGuard({
      adminSyncEnabled: true,
      adminApiKey: 'test-admin-key',
    } as never);

    expect(
      guard.canActivate(
        createContext({ authorization: 'Bearer test-admin-key' }),
      ),
    ).toBe(true);
  });

  it('should reject invalid credentials', () => {
    const guard = new AdminApiKeyGuard({
      adminSyncEnabled: true,
      adminApiKey: 'test-admin-key',
    } as never);

    expect(() =>
      guard.canActivate(createContext({ 'x-admin-api-key': 'wrong-key' })),
    ).toThrow(UnauthorizedException);
  });

  it('should reject requests without credentials', () => {
    const guard = new AdminApiKeyGuard({
      adminSyncEnabled: true,
      adminApiKey: 'test-admin-key',
    } as never);

    expect(() => guard.canActivate(createContext({}))).toThrow(
      UnauthorizedException,
    );
  });

  it('should reject malformed bearer authorization headers', () => {
    const guard = new AdminApiKeyGuard({
      adminSyncEnabled: true,
      adminApiKey: 'test-admin-key',
    } as never);

    expect(() =>
      guard.canActivate(
        createContext({ authorization: 'Basic test-admin-key' }),
      ),
    ).toThrow(UnauthorizedException);
  });
});

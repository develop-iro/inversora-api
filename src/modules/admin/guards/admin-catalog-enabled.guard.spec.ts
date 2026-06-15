import { NotFoundException } from '@nestjs/common';
import { AdminCatalogEnabledGuard } from './admin-catalog-enabled.guard';

describe('AdminCatalogEnabledGuard', () => {
  it('should reject requests when admin catalog is disabled', () => {
    const guard = new AdminCatalogEnabledGuard({
      adminCatalogEnabled: false,
    } as never);

    expect(() => guard.canActivate()).toThrow(NotFoundException);
  });

  it('should allow requests when admin catalog is enabled', () => {
    const guard = new AdminCatalogEnabledGuard({
      adminCatalogEnabled: true,
    } as never);

    expect(guard.canActivate()).toBe(true);
  });
});

import { NotFoundException } from '@nestjs/common';
import { AdminSyncEnabledGuard } from './admin-sync-enabled.guard';

describe('AdminSyncEnabledGuard', () => {
  it('should reject requests when admin sync is disabled', () => {
    const guard = new AdminSyncEnabledGuard({
      adminSyncEnabled: false,
    } as never);

    expect(() => guard.canActivate()).toThrow(NotFoundException);
  });

  it('should allow requests when admin sync is enabled', () => {
    const guard = new AdminSyncEnabledGuard({
      adminSyncEnabled: true,
    } as never);

    expect(guard.canActivate()).toBe(true);
  });
});

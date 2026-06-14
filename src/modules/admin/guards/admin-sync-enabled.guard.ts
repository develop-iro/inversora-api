import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.service';

/**
 * Ensures manual admin sync endpoints are enabled.
 */
@Injectable()
export class AdminSyncEnabledGuard implements CanActivate {
  constructor(private readonly config: AppConfigService) {}

  /**
   * Validates that manual admin sync is enabled.
   */
  canActivate(): boolean {
    if (!this.config.adminSyncEnabled) {
      throw new NotFoundException();
    }

    return true;
  }
}

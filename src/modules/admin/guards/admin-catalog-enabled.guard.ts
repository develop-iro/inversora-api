import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.service';

/**
 * Ensures catalog visibility admin endpoints are enabled.
 */
@Injectable()
export class AdminCatalogEnabledGuard implements CanActivate {
  constructor(private readonly config: AppConfigService) {}

  /**
   * Validates that admin catalog management is enabled.
   */
  canActivate(): boolean {
    if (!this.config.adminCatalogEnabled) {
      throw new NotFoundException();
    }

    return true;
  }
}

import { Module } from '@nestjs/common';
import { FundsModule } from '../funds/funds.module';
import { AdminFundsController } from './controllers/admin-funds.controller';
import { AdminSyncController } from './controllers/admin-sync.controller';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';
import { AdminCatalogEnabledGuard } from './guards/admin-catalog-enabled.guard';
import { AdminSyncEnabledGuard } from './guards/admin-sync-enabled.guard';

/**
 * Administrative endpoints for development and operational tasks.
 */
@Module({
  imports: [FundsModule],
  controllers: [AdminSyncController, AdminFundsController],
  providers: [
    AdminApiKeyGuard,
    AdminSyncEnabledGuard,
    AdminCatalogEnabledGuard,
  ],
})
export class AdminModule {}

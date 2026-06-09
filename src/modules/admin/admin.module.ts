import { Module } from '@nestjs/common';
import { FundsModule } from '../funds/funds.module';
import { AdminSyncController } from './controllers/admin-sync.controller';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';

/**
 * Administrative endpoints for development and operational tasks.
 */
@Module({
  imports: [FundsModule],
  controllers: [AdminSyncController],
  providers: [AdminApiKeyGuard],
})
export class AdminModule {}

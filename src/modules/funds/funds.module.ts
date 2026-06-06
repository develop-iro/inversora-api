import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/database/prisma.module';
import { ProvidersModule } from '../providers/providers.module';
import { FundSyncScheduler } from './schedulers/fund-sync.scheduler';
import { FundCompositionRepository } from './repositories/fund-composition.repository';
import { FundPricesRepository } from './repositories/fund-prices.repository';
import { FundsRepository } from './repositories/funds.repository';
import { FundCompositionService } from './services/fund-composition.service';
import { FundDailySyncService } from './services/fund-daily-sync.service';
import { FundPriceSyncService } from './services/fund-price-sync.service';
import { FundPricesService } from './services/fund-prices.service';
import { FundSyncService } from './services/fund-sync.service';

/**
 * Domain module for persisted fund entities and fund-related use cases.
 */
@Module({
  imports: [PrismaModule, ProvidersModule],
  providers: [
    FundsRepository,
    FundPricesRepository,
    FundPricesService,
    FundCompositionRepository,
    FundCompositionService,
    FundPriceSyncService,
    FundSyncService,
    FundDailySyncService,
    FundSyncScheduler,
  ],
  exports: [
    FundPricesService,
    FundCompositionService,
    FundPriceSyncService,
    FundSyncService,
    FundDailySyncService,
  ],
})
export class FundsModule {}

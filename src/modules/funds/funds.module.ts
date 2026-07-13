import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../shared/database/prisma.module';
import { ProvidersModule } from '../providers/providers.module';
import { ScoringModule } from '../scoring/scoring.module';
import { FundsController } from './controllers/funds.controller';
import { GetFundsUseCase } from './get-funds';
import { GetCatalogSummaryUseCase } from './get-catalog-summary';
import { GetFundCatalogMetricsUseCase } from './get-fund-catalog-metrics';
import { FundSyncScheduler } from './schedulers/fund-sync.scheduler';
import { CatalogVisibilityService } from './services/catalog-visibility.service';
import { FundEditorialService } from './services/fund-editorial.service';
import { FundCompositionRepository } from './repositories/fund-composition.repository';
import { FundPricesRepository } from './repositories/fund-prices.repository';
import { FundsRepository } from './repositories/funds.repository';
import { FundCompositionService } from './services/fund-composition.service';
import { FundCompositionSyncService } from './services/fund-composition-sync.service';
import { FundDailySyncService } from './services/fund-daily-sync.service';
import { FundDiscoveryService } from './services/fund-discovery.service';
import { FundMaterializedReturnsService } from './services/fund-materialized-returns.service';
import { FundPriceSyncService } from './services/fund-price-sync.service';
import { FundPricesService } from './services/fund-prices.service';
import { FundSyncService } from './services/fund-sync.service';
import { FundsService } from './services/funds.service';

/**
 * Domain module for persisted fund entities and fund-related use cases.
 */
@Module({
  imports: [PrismaModule, ProvidersModule, forwardRef(() => ScoringModule)],
  controllers: [FundsController],
  providers: [
    FundsRepository,
    GetFundsUseCase,
    GetCatalogSummaryUseCase,
    GetFundCatalogMetricsUseCase,
    FundsService,
    FundPricesRepository,
    FundPricesService,
    FundCompositionRepository,
    FundCompositionService,
    FundCompositionSyncService,
    FundPriceSyncService,
    FundMaterializedReturnsService,
    FundSyncService,
    FundDiscoveryService,
    FundDailySyncService,
    FundSyncScheduler,
    CatalogVisibilityService,
    FundEditorialService,
  ],
  exports: [
    FundsRepository,
    FundsService,
    CatalogVisibilityService,
    FundEditorialService,
    FundPricesService,
    FundCompositionService,
    FundCompositionSyncService,
    FundPriceSyncService,
    FundMaterializedReturnsService,
    FundSyncService,
    FundDailySyncService,
  ],
})
export class FundsModule {}

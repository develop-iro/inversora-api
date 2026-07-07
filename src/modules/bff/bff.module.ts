import { Module, forwardRef } from '@nestjs/common';
import { FundsModule } from '../funds/funds.module';
import { ProvidersModule } from '../providers/providers.module';
import { ScoringModule } from '../scoring/scoring.module';
import { FeaturedFundsController } from './controllers/featured-funds.controller';
import { FundDetailController } from './controllers/fund-detail.controller';
import { InvestmentNewsController } from './controllers/investment-news.controller';
import { GetFundByIsinUseCase } from './get-fund-by-isin';
import { GetFundLiveMarketSnapshotUseCase } from './get-fund-live-market-snapshot';
import { FeaturedFundsService } from './services/featured-funds.service';
import { FundDetailService } from './services/fund-detail.service';
import { FundLiveMarketSnapshotService } from './services/fund-live-market-snapshot.service';
import { InvestmentNewsService } from './services/investment-news.service';

/**
 * Backend-for-frontend module that exposes aggregated mobile contracts.
 */
@Module({
  imports: [
    forwardRef(() => FundsModule),
    forwardRef(() => ScoringModule),
    ProvidersModule,
  ],
  controllers: [
    FeaturedFundsController,
    FundDetailController,
    InvestmentNewsController,
  ],
  providers: [
    GetFundByIsinUseCase,
    GetFundLiveMarketSnapshotUseCase,
    FeaturedFundsService,
    FundDetailService,
    FundLiveMarketSnapshotService,
    InvestmentNewsService,
  ],
  exports: [
    FeaturedFundsService,
    FundDetailService,
    FundLiveMarketSnapshotService,
    InvestmentNewsService,
  ],
})
export class BffModule {}

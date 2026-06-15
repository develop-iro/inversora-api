import { Module, forwardRef } from '@nestjs/common';
import { FundsModule } from '../funds/funds.module';
import { ScoringModule } from '../scoring/scoring.module';
import { FeaturedFundsController } from './controllers/featured-funds.controller';
import { FundDetailController } from './controllers/fund-detail.controller';
import { GetFundByIsinUseCase } from './get-fund-by-isin';
import { FeaturedFundsService } from './services/featured-funds.service';
import { FundDetailService } from './services/fund-detail.service';

/**
 * Backend-for-frontend module that exposes aggregated mobile contracts.
 */
@Module({
  imports: [forwardRef(() => FundsModule), forwardRef(() => ScoringModule)],
  controllers: [FeaturedFundsController, FundDetailController],
  providers: [GetFundByIsinUseCase, FeaturedFundsService, FundDetailService],
  exports: [FeaturedFundsService, FundDetailService],
})
export class BffModule {}

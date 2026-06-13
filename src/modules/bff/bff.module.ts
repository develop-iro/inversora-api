import { Module, forwardRef } from '@nestjs/common';
import { FundsModule } from '../funds/funds.module';
import { ScoringModule } from '../scoring/scoring.module';
import { FundDetailController } from './controllers/fund-detail.controller';
import { FundDetailService } from './services/fund-detail.service';

/**
 * Backend-for-frontend module that exposes aggregated mobile contracts.
 */
@Module({
  imports: [forwardRef(() => FundsModule), forwardRef(() => ScoringModule)],
  controllers: [FundDetailController],
  providers: [FundDetailService],
  exports: [FundDetailService],
})
export class BffModule {}

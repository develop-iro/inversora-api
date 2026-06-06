import { Module } from '@nestjs/common';
import { ProvidersModule } from '../providers/providers.module';
import { FmpToInvesoraFundAdapter } from './adapters/fmp-to-invesora-fund.adapter';
import { FundsService } from './funds.service';
import { FUND_DATA_ADAPTER } from './funds.tokens';

/**
 * Domain module for indexed fund discovery and analytics.
 */
@Module({
  imports: [ProvidersModule],
  providers: [
    FundsService,
    FmpToInvesoraFundAdapter,
    {
      provide: FUND_DATA_ADAPTER,
      useExisting: FmpToInvesoraFundAdapter,
    },
  ],
  exports: [FundsService],
})
export class FundsModule {}

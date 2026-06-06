import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/database/prisma.module';
import { FundCompositionRepository } from './repositories/fund-composition.repository';
import { FundPricesRepository } from './repositories/fund-prices.repository';
import { FundCompositionService } from './services/fund-composition.service';
import { FundPricesService } from './services/fund-prices.service';

/**
 * Domain module for persisted fund entities and fund-related use cases.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    FundPricesRepository,
    FundPricesService,
    FundCompositionRepository,
    FundCompositionService,
  ],
  exports: [FundPricesService, FundCompositionService],
})
export class FundsModule {}

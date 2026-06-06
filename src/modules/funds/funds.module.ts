import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/database/prisma.module';
import { FundPricesRepository } from './repositories/fund-prices.repository';
import { FundPricesService } from './services/fund-prices.service';

/**
 * Domain module for persisted fund entities and fund-related use cases.
 */
@Module({
  imports: [PrismaModule],
  providers: [FundPricesRepository, FundPricesService],
  exports: [FundPricesService],
})
export class FundsModule {}

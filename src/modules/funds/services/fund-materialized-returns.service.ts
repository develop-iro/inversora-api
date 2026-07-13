import { Injectable } from '@nestjs/common';
import { buildFundReturnSnapshot } from '../entities/fund-return-snapshot.builder';
import { updateFundMaterializedReturnsInputSchema } from '../entities/fund-materialized.schema';
import { FUND_RETURN_HISTORY_LOOKBACK_DAYS } from '../entities/fund-returns.enricher';
import {
  addDaysToIsoDate,
  getTodayIsoDate,
} from '../entities/fund-price.mapper';
import { FundsRepository } from '../repositories/funds.repository';
import { FundPricesService } from './fund-prices.service';

/**
 * Persists materialized return columns from stored price history.
 */
@Injectable()
export class FundMaterializedReturnsService {
  constructor(
    private readonly fundsRepository: FundsRepository,
    private readonly fundPricesService: FundPricesService,
  ) {}

  /**
   * Recomputes and persists return columns for one fund.
   *
   * @param fundId - Persisted fund identifier.
   */
  async refreshForFundId(fundId: string): Promise<void> {
    const from = addDaysToIsoDate(
      getTodayIsoDate(),
      -FUND_RETURN_HISTORY_LOOKBACK_DAYS,
    );
    const prices = await this.fundPricesService.getHistory(fundId, { from });
    const snapshot = buildFundReturnSnapshot(prices);
    const payload = updateFundMaterializedReturnsInputSchema.parse({
      return1y: snapshot.oneYear,
      return3y: snapshot.threeYear,
      returnYtd: snapshot.ytd,
      returnAsOf: snapshot.asOf,
    });

    await this.fundsRepository.updateMaterializedReturns(fundId, payload);
  }
}

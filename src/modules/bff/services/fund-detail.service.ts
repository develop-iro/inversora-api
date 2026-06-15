import { Injectable } from '@nestjs/common';
import type { FundDetailResponse } from '../entities/fund-detail.schema';
import { GetFundByIsinUseCase } from '../get-fund-by-isin';

/**
 * Aggregates fund detail data for the mobile `FundDetail` contract.
 */
@Injectable()
export class FundDetailService {
  constructor(private readonly getFundByIsinUseCase: GetFundByIsinUseCase) {}

  /**
   * Returns the aggregated fund detail payload for an ISIN route parameter.
   *
   * @param rawIsin - Raw ISIN route parameter.
   * @returns Validated `FundDetail` response.
   */
  async getFundDetailByIsin(rawIsin: string): Promise<FundDetailResponse> {
    return this.getFundByIsinUseCase.execute(rawIsin);
  }
}

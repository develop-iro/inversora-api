import { Injectable } from '@nestjs/common';
import type { FundLiveMarketSnapshot } from '../../core/api/schemas/fund-live-market-snapshot.schema';
import { FundLiveMarketSnapshotService } from './services/fund-live-market-snapshot.service';

/**
 * Use case for on-demand fund market snapshots (`GET /funds/:isin/market-snapshot`).
 */
@Injectable()
export class GetFundLiveMarketSnapshotUseCase {
  constructor(
    private readonly fundLiveMarketSnapshotService: FundLiveMarketSnapshotService,
  ) {}

  /**
   * Returns a live or latest EOD market snapshot for a fund detail screen.
   *
   * @param rawIsin - Raw ISIN route parameter.
   */
  execute(rawIsin: string): Promise<FundLiveMarketSnapshot> {
    return this.fundLiveMarketSnapshotService.getByIsin(rawIsin);
  }
}

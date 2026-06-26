import { Injectable } from '@nestjs/common';
import { parseApiResponse } from '../../core/api/parse-api-response';
import {
  catalogSummaryResponseSchema,
  type CatalogSummaryResponse,
} from '../../core/api/schemas/catalog-summary.schema';
import { FundsRepository } from './repositories/funds.repository';

/**
 * Use case for catalog ingestion progress reads (`GET /funds/catalog-summary`).
 */
@Injectable()
export class GetCatalogSummaryUseCase {
  constructor(private readonly fundsRepository: FundsRepository) {}

  /**
   * Returns aggregate fund counts grouped by catalog visibility.
   *
   * @returns Validated catalog summary for app dashboards and sync monitoring.
   */
  async execute(): Promise<CatalogSummaryResponse> {
    const byVisibility = await this.fundsRepository.countByCatalogVisibility();

    return parseApiResponse(
      catalogSummaryResponseSchema,
      {
        total:
          byVisibility.visible +
          byVisibility.quarantined +
          byVisibility.blocked,
        byVisibility,
        asOf: new Date().toISOString(),
      },
      'get-catalog-summary',
    );
  }
}

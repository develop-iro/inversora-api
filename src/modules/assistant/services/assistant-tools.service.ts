import { Injectable, NotFoundException } from '@nestjs/common';

import type { Fund } from '../../funds/entities/fund.schema';
import { CatalogVisibilityService } from '../../funds/services/catalog-visibility.service';
import { FundsRepository } from '../../funds/repositories/funds.repository';
import { ScoringService } from '../../scoring/services/scoring.service';

export type AssistantFundToolSnapshot = {
  isin: string;
  symbol: string;
  name: string;
  vehicle: string;
  currency: string;
  benchmark: string | null;
  riskLevel: number | null;
  metrics: Fund['metrics'];
  score: {
    value: number | null;
    summary?: string;
    warnings?: string[];
    version?: string;
  };
};

/**
 * Read-only data tools exposed to the Python SORA agent.
 */
@Injectable()
export class AssistantToolsService {
  constructor(
    private readonly fundsRepository: FundsRepository,
    private readonly scoringService: ScoringService,
    private readonly catalogVisibilityService: CatalogVisibilityService,
  ) {}

  async getFundSnapshot(isin: string): Promise<AssistantFundToolSnapshot> {
    const normalizedIsin = normalizeIsin(isin);
    const fund = await this.fundsRepository.findByIsin(normalizedIsin);

    if (fund === null) {
      throw new NotFoundException(`Fund ${normalizedIsin} was not found`);
    }

    this.catalogVisibilityService.assertPublicCatalogVisible(fund);

    return this.buildSnapshot(fund, normalizedIsin);
  }

  async compareFunds(
    isins: readonly string[],
  ): Promise<{ funds: AssistantFundToolSnapshot[] }> {
    const normalizedIsins = [...new Set(isins.map(normalizeIsin))].slice(0, 5);
    const funds = await this.fundsRepository.findByIsins(normalizedIsins);
    const snapshots = await Promise.all(
      normalizedIsins
        .map((isin) => ({ isin, fund: funds.get(isin) }))
        .filter(
          (entry): entry is { isin: string; fund: Fund } =>
            entry.fund !== undefined,
        )
        .map((entry) => {
          this.catalogVisibilityService.assertPublicCatalogVisible(entry.fund);
          return this.buildSnapshot(entry.fund, entry.isin);
        }),
    );

    return { funds: snapshots };
  }

  private async buildSnapshot(
    fund: Fund,
    requestedIsin: string,
  ): Promise<AssistantFundToolSnapshot> {
    const score = await this.scoringService.calculateScoreForFundId(fund.id);

    return {
      isin: fund.isin ?? requestedIsin,
      symbol: fund.symbol,
      name: fund.name,
      vehicle: fund.vehicle,
      currency: fund.currency,
      benchmark: fund.benchmark,
      riskLevel: fund.riskLevel,
      metrics: fund.metrics,
      score: {
        value: score?.score ?? null,
        summary: score?.summary,
        warnings: score?.warnings,
        version: score?.version,
      },
    };
  }
}

function normalizeIsin(isin: string): string {
  return isin.trim().toUpperCase();
}

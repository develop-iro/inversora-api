import { Injectable, NotFoundException } from '@nestjs/common';

import type { Fund } from '../../funds/entities/fund.schema';
import { CatalogVisibilityService } from '../../funds/services/catalog-visibility.service';
import { FundsRepository } from '../../funds/repositories/funds.repository';
import type { InvesoraScore } from '../../scoring/entities/invesora-score.schema';
import { ScoringService } from '../../scoring/services/scoring.service';
import { evaluateComparisonFairness } from '../entities/assistant-comparison.utils';
import { GlossaryService } from './glossary.service';

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

export type AssistantScoreBreakdownToolResponse = {
  isin: string;
  name: string;
  score: number | null;
  version?: string;
  breakdown?: InvesoraScore['breakdown'];
  summary?: string;
  warnings?: string[];
};

export type AssistantGlossaryToolResponse = {
  term: string;
  explanation: string;
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
    private readonly glossaryService: GlossaryService,
  ) {}

  async getFundSnapshot(isin: string): Promise<AssistantFundToolSnapshot> {
    const normalizedIsin = normalizeIsin(isin);
    const fund = await this.findVisibleFund(normalizedIsin);

    return this.buildSnapshot(fund, normalizedIsin);
  }

  async getScoreBreakdown(
    isin: string,
  ): Promise<AssistantScoreBreakdownToolResponse> {
    const normalizedIsin = normalizeIsin(isin);
    const fund = await this.findVisibleFund(normalizedIsin);
    const score = await this.scoringService.calculateScoreForFundId(fund.id);

    return {
      isin: fund.isin ?? normalizedIsin,
      name: fund.name,
      score: score?.score ?? null,
      version: score?.version,
      breakdown: score?.breakdown,
      summary: score?.summary,
      warnings: score?.warnings,
    };
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

  async validateComparisonFairness(isins: readonly string[]) {
    const normalizedIsins = [...new Set(isins.map(normalizeIsin))].slice(0, 5);
    const funds = await this.fundsRepository.findByIsins(normalizedIsins);
    const profiles = normalizedIsins
      .map((isin) => ({ isin, fund: funds.get(isin) }))
      .filter(
        (entry): entry is { isin: string; fund: Fund } =>
          entry.fund !== undefined,
      )
      .map((entry) => {
        this.catalogVisibilityService.assertPublicCatalogVisible(entry.fund);

        return {
          isin: entry.fund.isin ?? entry.isin,
          benchmark: entry.fund.benchmark,
          currency: entry.fund.currency,
          vehicle: entry.fund.vehicle,
        };
      });

    const result = evaluateComparisonFairness(profiles);

    return {
      isFair: result.isFair,
      warnings: [...result.warnings],
      funds: result.funds.map((fund) => ({ ...fund })),
    };
  }

  getGlossaryTerm(term: string): AssistantGlossaryToolResponse {
    const entry = this.glossaryService.lookup(term);

    if (entry === null) {
      throw new NotFoundException(
        `Glossary term "${term.trim()}" was not found`,
      );
    }

    return {
      term: entry.term,
      explanation: entry.explanation,
    };
  }

  private async findVisibleFund(isin: string): Promise<Fund> {
    const fund = await this.fundsRepository.findByIsin(isin);

    if (fund === null) {
      throw new NotFoundException(`Fund ${isin} was not found`);
    }

    this.catalogVisibilityService.assertPublicCatalogVisible(fund);

    return fund;
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

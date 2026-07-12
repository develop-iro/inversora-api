import { Injectable } from '@nestjs/common';
import type { Fund } from '../../funds/entities/fund.schema';
import { FUND_SECTOR_EXPOSURE_CATEGORY } from '../../funds/entities/fund-sector-exposure.schema';
import { FundCompositionService } from '../../funds/services/fund-composition.service';
import { FundPricesService } from '../../funds/services/fund-prices.service';
import { FundsRepository } from '../../funds/repositories/funds.repository';
import { CatalogVisibilityService } from '../../funds/services/catalog-visibility.service';
import {
  buildFundScoringMetrics,
  resolveScoringPeerGroupKey,
} from '../entities/fund-scoring-metrics.builder';
import {
  invesoraScoreSchema,
  type FundScoringMetrics,
  type InvesoraScore,
  type ScoringPeerContext,
} from '../entities/invesora-score.schema';
import {
  scoreAge,
  scoreAum,
  scoreTer,
  scoreTrackingError,
} from '../entities/rn04-score-factor.calculators';
import {
  buildScoreSummary,
  buildScoreWarnings,
} from '../entities/score-summary.builder';
import {
  SCORE_MAX_POINTS,
  SCORING_ALGORITHM_VERSION,
} from '../entities/score-weights';
import { clampScore } from '../entities/score-utils';
import type {
  ScoringSyncItemResult,
  ScoringSyncResult,
} from './scoring-sync.types';

const FACTOR_LABELS = {
  ter: 'Comisión (TER)',
  tracking: 'Tracking error',
  aum: 'Patrimonio (AUM)',
  age: 'Antigüedad del fondo',
} as const;

/** Maximum parallel metric builds during bulk scoring (avoids Prisma pool exhaustion). */
const SCORING_METRICS_BATCH_SIZE = 4;

/**
 * Domain service that computes the Invesora Score for index funds and ETFs.
 *
 * @see docs/scoring-rn-04.md
 */
@Injectable()
export class ScoringService {
  constructor(
    private readonly fundsRepository: FundsRepository,
    private readonly catalogVisibilityService: CatalogVisibilityService,
    private readonly fundPricesService: FundPricesService,
    private readonly fundCompositionService: FundCompositionService,
  ) {}

  /**
   * Calculates the Invesora Score from a fund entity and extended metrics.
   *
   * @param fund - Persisted fund entity.
   * @param metrics - Extended scoring metrics derived from prices and composition.
   * @param context - Optional peer group for benchmark-relative scoring.
   */
  calculateFundScore(
    _fund: Fund,
    metrics: FundScoringMetrics,
    context: ScoringPeerContext = { peers: [] },
  ): InvesoraScore {
    const peers = context.peers;

    const ter = scoreTer(metrics, peers);
    const tracking = scoreTrackingError(metrics, peers);
    const aum = scoreAum(metrics, peers);
    const age = scoreAge(metrics, peers);

    const breakdown = {
      ter: {
        points: ter.points,
        maxPoints: SCORE_MAX_POINTS.ter,
        label: FACTOR_LABELS.ter,
        incomplete: ter.incomplete,
      },
      tracking: {
        points: tracking.points,
        maxPoints: SCORE_MAX_POINTS.tracking,
        label: FACTOR_LABELS.tracking,
        incomplete: tracking.incomplete,
      },
      aum: {
        points: aum.points,
        maxPoints: SCORE_MAX_POINTS.aum,
        label: FACTOR_LABELS.aum,
        incomplete: aum.incomplete,
      },
      age: {
        points: age.points,
        maxPoints: SCORE_MAX_POINTS.age,
        label: FACTOR_LABELS.age,
        incomplete: age.incomplete,
      },
    };

    const totalScore = clampScore(
      breakdown.ter.points +
        breakdown.tracking.points +
        breakdown.aum.points +
        breakdown.age.points,
    );

    const provisionalScore: InvesoraScore = {
      score: totalScore,
      version: SCORING_ALGORITHM_VERSION,
      breakdown,
      summary: '',
      warnings: [],
    };

    return invesoraScoreSchema.parse({
      ...provisionalScore,
      summary: buildScoreSummary(breakdown),
      warnings: buildScoreWarnings(breakdown),
    });
  }

  /**
   * Calculates scores for multiple funds, comparing each one within its peer group.
   *
   * @param entries - Funds with their extended scoring metrics.
   */
  calculateCategoryScores(
    entries: readonly { fund: Fund; metrics: FundScoringMetrics }[],
  ): Map<string, InvesoraScore> {
    const grouped = new Map<string, FundScoringMetrics[]>();

    for (const entry of entries) {
      const key = resolveScoringPeerGroupKey(entry.fund);
      const group = grouped.get(key) ?? [];
      group.push(entry.metrics);
      grouped.set(key, group);
    }

    const results = new Map<string, InvesoraScore>();

    for (const entry of entries) {
      const key = resolveScoringPeerGroupKey(entry.fund);
      const peers = grouped.get(key) ?? [];

      const peerMetrics = peers.filter((peer) => peer !== entry.metrics);

      results.set(
        entry.fund.id,
        this.calculateFundScore(entry.fund, entry.metrics, {
          peers: peerMetrics,
        }),
      );
    }

    return results;
  }

  /**
   * Loads persisted fund data and computes the Invesora Score for a fund id.
   *
   * @param fundId - Persisted fund identifier.
   */
  async calculateScoreForFundId(fundId: string): Promise<InvesoraScore | null> {
    const fund = await this.fundsRepository.findById(fundId);

    if (fund === null) {
      return null;
    }

    const metrics = await this.buildMetricsForFund(fund);
    const peerEntries = await this.buildPeerEntriesForFund(fund);
    const peers = peerEntries
      .filter((entry) => entry.fund.id !== fund.id)
      .map((entry) => entry.metrics);

    return this.calculateFundScore(fund, metrics, { peers });
  }

  /**
   * Computes rounded Invesora Scores for multiple funds using peer comparison.
   *
   * Loads metrics only for funds that share a peer group with the requested ids
   * so list and featured cards stay aligned with fund detail scoring.
   *
   * @param fundIds - Persisted fund identifiers to score.
   */
  async calculateScoresForFundIds(
    fundIds: readonly string[],
  ): Promise<Map<string, number>> {
    if (fundIds.length === 0) {
      return new Map();
    }

    const allFunds = await this.fundsRepository.findAll();
    const requestedIdSet = new Set(fundIds);
    const requestedFunds = allFunds.filter((fund) =>
      requestedIdSet.has(fund.id),
    );

    if (requestedFunds.length === 0) {
      return new Map();
    }

    const peerKeysNeeded = new Set(
      requestedFunds.map((fund) => resolveScoringPeerGroupKey(fund)),
    );
    const relevantFunds = allFunds.filter((fund) =>
      peerKeysNeeded.has(resolveScoringPeerGroupKey(fund)),
    );
    const entries = await mapInBatches(
      relevantFunds,
      SCORING_METRICS_BATCH_SIZE,
      async (peerFund) => ({
        fund: peerFund,
        metrics: await this.buildMetricsForFund(peerFund),
      }),
    );
    const categoryScores = this.calculateCategoryScores(entries);
    const scores = new Map<string, number>();

    for (const fundId of fundIds) {
      const score = categoryScores.get(fundId);

      if (score !== undefined) {
        scores.set(fundId, Math.round(score.score));
      }
    }

    return scores;
  }

  /**
   * Recalculates scores for all persisted funds and stores them in PostgreSQL.
   *
   * Scores are computed with peer comparison within each benchmark or category
   * group so rankings stay comparable.
   */
  async recalculateAllScores(): Promise<ScoringSyncResult> {
    const funds = await this.fundsRepository.findAll();

    if (funds.length === 0) {
      return {
        total: 0,
        updated: 0,
        results: [],
      };
    }

    const entries = await mapInBatches(
      funds,
      SCORING_METRICS_BATCH_SIZE,
      async (fund) => ({
        fund,
        metrics: await this.buildMetricsForFund(fund),
      }),
    );
    const scores = this.calculateCategoryScores(entries);
    const results: ScoringSyncItemResult[] = [];

    for (const entry of entries) {
      const computedScore = scores.get(entry.fund.id);

      if (computedScore === undefined) {
        continue;
      }

      const updatedFund = await this.fundsRepository.updateScore(
        entry.fund.id,
        computedScore.score,
      );

      await this.catalogVisibilityService.applyAutomaticVisibilityRules(
        updatedFund,
      );

      results.push({
        fundId: entry.fund.id,
        symbol: entry.fund.symbol,
        score: computedScore.score,
      });
    }

    return {
      total: funds.length,
      updated: results.length,
      results,
    };
  }

  private async buildMetricsForFund(fund: Fund): Promise<FundScoringMetrics> {
    const [prices, holdingsSnapshot, sectorSnapshot] = await Promise.all([
      this.fundPricesService.getHistory(fund.id),
      this.fundCompositionService.getHoldings(fund.id),
      this.fundCompositionService.getAllocationsByCategory(
        fund.id,
        FUND_SECTOR_EXPOSURE_CATEGORY,
      ),
    ]);

    return buildFundScoringMetrics({
      metrics: fund.metrics,
      prices,
      holdings: holdingsSnapshot?.holdings,
      sectors: sectorSnapshot?.allocations,
    });
  }

  private async buildPeerEntriesForFund(
    fund: Fund,
  ): Promise<Array<{ fund: Fund; metrics: FundScoringMetrics }>> {
    const peerGroupKey = resolveScoringPeerGroupKey(fund);
    const allFunds = await this.fundsRepository.findAll();

    const peers = allFunds.filter(
      (candidate) => resolveScoringPeerGroupKey(candidate) === peerGroupKey,
    );

    return Promise.all(
      peers.map(async (peerFund) => ({
        fund: peerFund,
        metrics: await this.buildMetricsForFund(peerFund),
      })),
    );
  }
}

/**
 * Maps items through an async function in small concurrent batches.
 *
 * @param items - Items to process.
 * @param batchSize - Maximum concurrent mapper invocations.
 * @param mapper - Async transform for a single item.
 */
async function mapInBatches<TItem, TResult>(
  items: readonly TItem[],
  batchSize: number,
  mapper: (item: TItem) => Promise<TResult>,
): Promise<TResult[]> {
  const results: TResult[] = [];

  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    const batchResults = await Promise.all(batch.map((item) => mapper(item)));
    results.push(...batchResults);
  }

  return results;
}

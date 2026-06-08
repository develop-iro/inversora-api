import { Injectable } from '@nestjs/common';
import type { Fund } from '../../funds/entities/fund.schema';
import { FUND_SECTOR_EXPOSURE_CATEGORY } from '../../funds/entities/fund-sector-exposure.schema';
import { FundCompositionService } from '../../funds/services/fund-composition.service';
import { FundPricesService } from '../../funds/services/fund-prices.service';
import { FundsRepository } from '../../funds/repositories/funds.repository';
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
  scoreCost,
  scoreDiversification,
  scoreFundSize,
  scoreRisk,
  scoreRiskAdjustedReturn,
} from '../entities/score-factor.calculators';
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
  riskAdjustedReturn: 'Rentabilidad ajustada al riesgo',
  risk: 'Riesgo',
  cost: 'Comisión anual',
  diversification: 'Diversificación',
  fundSize: 'Tamaño del fondo',
  age: 'Antigüedad',
} as const;

/**
 * Domain service that computes the Invesora Score for index funds and ETFs.
 *
 * @see docs/scoring-algorithm.md
 */
@Injectable()
export class ScoringService {
  constructor(
    private readonly fundsRepository: FundsRepository,
    private readonly fundPricesService: FundPricesService,
    private readonly fundCompositionService: FundCompositionService,
  ) {}

  /**
   * Calculates the Invesora Score from a fund entity and extended metrics.
   *
   * @param fund - Persisted fund entity.
   * @param metrics - Extended scoring metrics derived from prices and composition.
   * @param context - Optional peer group for category-relative scoring.
   */
  calculateFundScore(
    _fund: Fund,
    metrics: FundScoringMetrics,
    context: ScoringPeerContext = { peers: [] },
  ): InvesoraScore {
    const peers = context.peers;

    const riskAdjustedReturn = scoreRiskAdjustedReturn(metrics, peers);
    const risk = scoreRisk(metrics, peers);
    const cost = scoreCost(metrics, peers);
    const diversification = scoreDiversification(metrics, peers);
    const fundSize = scoreFundSize(metrics, peers);
    const age = scoreAge(metrics);

    const breakdown = {
      riskAdjustedReturn: {
        points: riskAdjustedReturn.points,
        maxPoints: SCORE_MAX_POINTS.riskAdjustedReturn,
        label: FACTOR_LABELS.riskAdjustedReturn,
        incomplete: riskAdjustedReturn.incomplete,
      },
      risk: {
        points: risk.points,
        maxPoints: SCORE_MAX_POINTS.risk,
        label: FACTOR_LABELS.risk,
        incomplete: risk.incomplete,
      },
      cost: {
        points: cost.points,
        maxPoints: SCORE_MAX_POINTS.cost,
        label: FACTOR_LABELS.cost,
        incomplete: cost.incomplete,
      },
      diversification: {
        points: diversification.points,
        maxPoints: SCORE_MAX_POINTS.diversification,
        label: FACTOR_LABELS.diversification,
        incomplete: diversification.incomplete,
      },
      fundSize: {
        points: fundSize.points,
        maxPoints: SCORE_MAX_POINTS.fundSize,
        label: FACTOR_LABELS.fundSize,
        incomplete: fundSize.incomplete,
      },
      age: {
        points: age.points,
        maxPoints: SCORE_MAX_POINTS.age,
        label: FACTOR_LABELS.age,
        incomplete: age.incomplete,
      },
    };

    const totalScore = clampScore(
      breakdown.riskAdjustedReturn.points +
        breakdown.risk.points +
        breakdown.cost.points +
        breakdown.diversification.points +
        breakdown.fundSize.points +
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

    const entries = await Promise.all(
      funds.map(async (fund) => ({
        fund,
        metrics: await this.buildMetricsForFund(fund),
      })),
    );
    const scores = this.calculateCategoryScores(entries);
    const results: ScoringSyncItemResult[] = [];

    for (const entry of entries) {
      const computedScore = scores.get(entry.fund.id);

      if (computedScore === undefined) {
        continue;
      }

      await this.fundsRepository.updateScore(
        entry.fund.id,
        computedScore.score,
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

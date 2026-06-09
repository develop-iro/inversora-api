import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { FundsRepository } from '../../funds/repositories/funds.repository';
import { FundCompositionService } from '../../funds/services/fund-composition.service';
import { FundPricesService } from '../../funds/services/fund-prices.service';
import { FundsService } from '../../funds/services/funds.service';
import { resolveScoringPeerGroupKey } from '../../scoring/entities/fund-scoring-metrics.builder';
import { ScoringService } from '../../scoring/services/scoring.service';
import { normalizeFundIsin } from '../entities/fund-isin.utils';
import {
  buildFundDetailResponse,
  filterPricesForYtd,
} from '../entities/fund-detail.mapper';
import type { FundDetailResponse } from '../entities/fund-detail.schema';

/**
 * Aggregates fund detail data for the mobile `FundDetail` contract.
 */
@Injectable()
export class FundDetailService {
  constructor(
    private readonly fundsRepository: FundsRepository,
    private readonly fundsService: FundsService,
    private readonly fundPricesService: FundPricesService,
    private readonly fundCompositionService: FundCompositionService,
    private readonly scoringService: ScoringService,
  ) {}

  /**
   * Returns the aggregated fund detail payload for an ISIN route parameter.
   *
   * @param rawIsin - Raw ISIN route parameter.
   * @returns Validated `FundDetail` response.
   */
  async getFundDetailByIsin(rawIsin: string): Promise<FundDetailResponse> {
    let isin: string;

    try {
      isin = normalizeFundIsin(rawIsin);
    } catch {
      throw new BadRequestException({
        message: 'Invalid ISIN format',
        error: 'Bad Request',
        statusCode: 400,
      });
    }

    const fund = await this.fundsRepository.findByIsin(isin);

    if (fund === null || fund.isin === null) {
      throw new NotFoundException({
        message: 'Fund not found',
        error: 'Not Found',
        statusCode: 404,
      });
    }

    try {
      const [
        score,
        chart1Y,
        chart3Y,
        chart5Y,
        countries,
        sectors,
        holdings,
        regionalSnapshot,
        assetAllocationSnapshot,
        capitalizationSnapshot,
        latestDate,
        allPrices,
        rank,
      ] = await Promise.all([
        this.scoringService.calculateScoreForFundId(fund.id),
        this.fundsService.getFundChart(fund.id, { period: '1Y' }),
        this.fundsService.getFundChart(fund.id, { period: '3Y' }),
        this.fundsService.getFundChart(fund.id, { period: '5Y' }),
        this.fundsService.getFundCountryExposure(fund.id, {}),
        this.fundsService.getFundSectorExposure(fund.id, {}),
        this.fundsService.getFundHoldings(fund.id, {}),
        this.fundCompositionService.getAllocationsByCategory(
          fund.id,
          'regional',
        ),
        this.fundCompositionService.getAllocationsByCategory(
          fund.id,
          'assetAllocation',
        ),
        this.fundCompositionService.getAllocationsByCategory(
          fund.id,
          'capitalization',
        ),
        this.fundPricesService.getLatestDate(fund.id),
        this.fundPricesService.getHistory(fund.id),
        this.resolveRankForFund(fund.id),
      ]);

      if (score === null) {
        throw new ServiceUnavailableException({
          message: 'Fund detail temporarily unavailable',
          error: 'Service Unavailable',
          statusCode: 503,
        });
      }

      const resolvedYtdPrices = filterPricesForYtd(allPrices, latestDate);
      const maxPrices = allPrices;

      return buildFundDetailResponse({
        fund,
        score,
        rank,
        charts: {
          '1Y': chart1Y,
          '3Y': chart3Y,
          '5Y': chart5Y,
        },
        ytdPrices: resolvedYtdPrices,
        maxPrices: maxPrices.length > 0 ? maxPrices : allPrices,
        allPrices,
        countries,
        sectors,
        holdings,
        allocationsByCategory: {
          regional: regionalSnapshot?.allocations,
          assetAllocation: assetAllocationSnapshot?.allocations,
          capitalization: capitalizationSnapshot?.allocations,
        },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      throw new ServiceUnavailableException({
        message: 'Fund detail temporarily unavailable',
        error: 'Service Unavailable',
        statusCode: 503,
      });
    }
  }

  /**
   * Resolves the 1-based rank of a fund inside its scoring peer group.
   *
   * @param fundId - Persisted fund identifier.
   */
  private async resolveRankForFund(
    fundId: string,
  ): Promise<number | undefined> {
    const fund = await this.fundsRepository.findById(fundId);

    if (fund === null) {
      return undefined;
    }

    const peerGroupKey = resolveScoringPeerGroupKey(fund);
    const peers = await this.fundsRepository.findAll();
    const rankedPeers = peers
      .filter(
        (peer) =>
          resolveScoringPeerGroupKey(peer) === peerGroupKey &&
          peer.score !== null,
      )
      .sort((left, right) => (right.score ?? 0) - (left.score ?? 0));
    const index = rankedPeers.findIndex((peer) => peer.id === fundId);

    return index >= 0 ? index + 1 : undefined;
  }
}

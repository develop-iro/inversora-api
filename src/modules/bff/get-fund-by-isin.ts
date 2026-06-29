import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { parseApiResponse } from '../../core/api/parse-api-response';
import {
  fundDetailResponseSchema,
  type FundDetailResponse,
} from '../../core/api/schemas/fund-detail.schema';
import { isCatalogVisible } from '../funds/entities/catalog-visibility.schema';
import { FundsRepository } from '../funds/repositories/funds.repository';
import { CatalogVisibilityService } from '../funds/services/catalog-visibility.service';
import { FundCompositionService } from '../funds/services/fund-composition.service';
import { FundPricesService } from '../funds/services/fund-prices.service';
import { FundsService } from '../funds/services/funds.service';
import { resolveScoringPeerGroupKey } from '../scoring/entities/fund-scoring-metrics.builder';
import { ScoringService } from '../scoring/services/scoring.service';
import {
  buildFundDetailResponse,
  filterPricesForYtd,
} from './entities/fund-detail.mapper';
import { normalizeFundIsin } from './entities/fund-isin.utils';
import { AppConfigService } from '../../shared/config/config.service';

/**
 * Use case for aggregated mobile fund detail reads (`GET /funds/:isin`).
 */
@Injectable()
export class GetFundByIsinUseCase {
  constructor(
    private readonly fundsRepository: FundsRepository,
    private readonly catalogVisibilityService: CatalogVisibilityService,
    private readonly fundsService: FundsService,
    private readonly fundPricesService: FundPricesService,
    private readonly fundCompositionService: FundCompositionService,
    private readonly scoringService: ScoringService,
    private readonly configService: AppConfigService,
  ) {}

  /**
   * Returns the aggregated fund detail payload for an ISIN route parameter.
   *
   * @param rawIsin - Raw ISIN route parameter.
   * @returns Validated `FundDetail` response.
   */
  async execute(rawIsin: string): Promise<FundDetailResponse> {
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

    this.catalogVisibilityService.assertPublicCatalogVisible(fund);

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
      const response = buildFundDetailResponse({
        fund,
        score,
        rank,
        brandfetchClientId: this.configService.brandfetchClientId,
        charts: {
          '1Y': chart1Y,
          '3Y': chart3Y,
          '5Y': chart5Y,
        },
        ytdPrices: resolvedYtdPrices,
        maxPrices: allPrices,
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

      return parseApiResponse(
        fundDetailResponseSchema,
        response,
        'get-fund-by-isin',
      );
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
          isCatalogVisible(peer) &&
          resolveScoringPeerGroupKey(peer) === peerGroupKey &&
          peer.score !== null,
      )
      .sort((left, right) => right.score! - left.score!);
    const index = rankedPeers.findIndex((peer) => peer.id === fundId);

    return index >= 0 ? index + 1 : undefined;
  }
}

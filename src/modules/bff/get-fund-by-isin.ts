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
import {
  buildFundChartResponse,
  resolveChartDateRange,
} from '../funds/entities/fund-chart.mapper';
import type { FundChartPeriod } from '../funds/entities/fund-chart.schema';
import type { FundPrice } from '../funds/entities/fund-price.schema';
import { FundsRepository } from '../funds/repositories/funds.repository';
import { CatalogVisibilityService } from '../funds/services/catalog-visibility.service';
import { FundCompositionService } from '../funds/services/fund-composition.service';
import { FundPricesService } from '../funds/services/fund-prices.service';
import { FundsService } from '../funds/services/funds.service';
import {
  buildFundDetailResponse,
  filterPricesForYtd,
} from './entities/fund-detail.mapper';
import { normalizeFundIsin } from './entities/fund-isin.utils';
import { AppConfigService } from '../../shared/config/config.service';
import { resolvePersistedInvesoraScore } from '../funds/entities/fund-materialized.mapper';

const DETAIL_CHART_PERIODS = [
  '1Y',
  '3Y',
  '5Y',
] as const satisfies readonly FundChartPeriod[];

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

    const score = resolvePersistedInvesoraScore(fund);

    if (score === null) {
      throw new ServiceUnavailableException({
        message: 'Fund detail temporarily unavailable',
        error: 'Service Unavailable',
        statusCode: 503,
      });
    }

    try {
      const [
        countries,
        sectors,
        holdings,
        regionalSnapshot,
        assetAllocationSnapshot,
        capitalizationSnapshot,
        latestDate,
        allPrices,
      ] = await Promise.all([
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
      ]);

      const charts = this.buildChartsFromPrices(fund.id, allPrices, latestDate);
      const resolvedYtdPrices = filterPricesForYtd(allPrices, latestDate);
      const response = buildFundDetailResponse({
        fund,
        score,
        rank: fund.materialized.peerRank ?? undefined,
        brandfetchClientId: this.configService.brandfetchClientId,
        charts,
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
   * Builds chart payloads for standard detail lookback windows from one price series.
   *
   * @param fundId - Persisted fund identifier.
   * @param allPrices - Full ascending price history.
   * @param latestDate - Latest persisted price date.
   */
  private buildChartsFromPrices(
    fundId: string,
    allPrices: readonly FundPrice[],
    latestDate: string | null,
  ): Record<'1Y' | '3Y' | '5Y', ReturnType<typeof buildFundChartResponse>> {
    return DETAIL_CHART_PERIODS.reduce(
      (charts, period) => {
        const range = resolveChartDateRange(period, latestDate);
        const prices =
          range.to === null
            ? []
            : allPrices.filter(
                (price) =>
                  price.date >= range.from &&
                  (range.to === null || price.date <= range.to),
              );

        charts[period] = buildFundChartResponse(
          fundId,
          period,
          range.from,
          range.to,
          prices,
        );

        return charts;
      },
      {} as Record<
        '1Y' | '3Y' | '5Y',
        ReturnType<typeof buildFundChartResponse>
      >,
    );
  }
}

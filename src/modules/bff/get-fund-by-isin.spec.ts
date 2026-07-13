import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CatalogVisibilityService } from '../funds/services/catalog-visibility.service';
import { FundsRepository } from '../funds/repositories/funds.repository';
import { FundCompositionService } from '../funds/services/fund-composition.service';
import { FundPricesService } from '../funds/services/fund-prices.service';
import { FundsService } from '../funds/services/funds.service';
import { AppConfigService } from '../../shared/config/config.service';
import {
  buildFundTestFixture,
  FUND_MATERIALIZED_FIELD_DEFAULTS,
} from '../funds/test-utils/fund.entity.fixtures';
import { GetFundByIsinUseCase } from './get-fund-by-isin';

const scoreBreakdown = {
  score: 82,
  version: 'rn-04' as const,
  breakdown: {
    ter: {
      points: 32,
      maxPoints: 40,
      label: 'Comisión (TER)',
    },
    tracking: {
      points: 30,
      maxPoints: 40,
      label: 'Tracking error',
    },
    aum: {
      points: 10,
      maxPoints: 10,
      label: 'Patrimonio (AUM)',
    },
    age: {
      points: 10,
      maxPoints: 10,
      label: 'Antigüedad del fondo',
    },
  },
  summary: 'Score sólido.',
  warnings: [],
};

const fund = buildFundTestFixture({
  id: '550e8400-e29b-41d4-a716-446655440000',
  symbol: 'SPY',
  isin: 'US78462F1030',
  name: 'State Street SPDR S&P 500 ETF Trust',
  provider: 'financial-modeling-prep',
  category: 'index',
  vehicle: 'etf',
  currency: 'USD',
  benchmark: 'S&P 500',
  issuer: 'State Street',
  metrics: {
    volatility: 14.2,
    drawdown: 8.5,
    ter: 0.0945,
    aum: 520_000_000_000,
    per: null,
    dividendYield: null,
    trackingError: 0.03,
  },
  riskLevel: 4,
  score: 82,
  catalogVisibility: 'visible',
  editorial: { badge: '', themeLabel: '', idealForBeginners: false },
  materialized: {
    ...FUND_MATERIALIZED_FIELD_DEFAULTS,
    scoreBreakdown,
    peerRank: 2,
    peerGroupKey: 's&p 500',
  },
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
});

describe('GetFundByIsinUseCase', () => {
  let useCase: GetFundByIsinUseCase;
  let fundsRepository: { findByIsin: jest.Mock };
  let fundsService: {
    getFundCountryExposure: jest.Mock;
    getFundSectorExposure: jest.Mock;
    getFundHoldings: jest.Mock;
  };
  let fundPricesService: {
    getLatestDate: jest.Mock;
    getHistory: jest.Mock;
  };
  let fundCompositionService: {
    getAllocationsByCategory: jest.Mock;
  };

  beforeEach(async () => {
    fundsRepository = {
      findByIsin: jest.fn().mockResolvedValue(fund),
    };
    fundsService = {
      getFundCountryExposure: jest.fn().mockResolvedValue({
        fundId: fund.id,
        asOf: null,
        countries: [],
      }),
      getFundSectorExposure: jest.fn().mockResolvedValue({
        fundId: fund.id,
        asOf: null,
        sectors: [],
      }),
      getFundHoldings: jest.fn().mockResolvedValue({
        fundId: fund.id,
        asOf: null,
        holdings: [],
      }),
    };
    fundPricesService = {
      getLatestDate: jest.fn().mockResolvedValue('2026-01-01'),
      getHistory: jest.fn().mockResolvedValue([]),
    };
    fundCompositionService = {
      getAllocationsByCategory: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetFundByIsinUseCase,
        { provide: FundsRepository, useValue: fundsRepository },
        {
          provide: CatalogVisibilityService,
          useFactory: () =>
            new CatalogVisibilityService(fundsRepository as never),
        },
        { provide: FundsService, useValue: fundsService },
        { provide: FundPricesService, useValue: fundPricesService },
        { provide: FundCompositionService, useValue: fundCompositionService },
        {
          provide: AppConfigService,
          useValue: { brandfetchClientId: undefined },
        },
      ],
    }).compile();

    useCase = module.get<GetFundByIsinUseCase>(GetFundByIsinUseCase);
  });

  it('should reject invalid ISIN formats', async () => {
    await expect(useCase.execute('INVALID')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should return 404 when the fund does not exist', async () => {
    fundsRepository.findByIsin.mockResolvedValue(null);

    await expect(useCase.execute('US78462F1030')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should return 404 when the persisted fund has a null ISIN', async () => {
    fundsRepository.findByIsin.mockResolvedValue({ ...fund, isin: null });

    await expect(useCase.execute('US78462F1030')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should return 404 when the fund is blocked from the public catalog', async () => {
    fundsRepository.findByIsin.mockResolvedValue({
      ...fund,
      catalogVisibility: 'blocked',
    });

    await expect(useCase.execute('US78462F1030')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should build detail when price history is empty', async () => {
    fundPricesService.getHistory.mockResolvedValue([]);
    fundPricesService.getLatestDate.mockResolvedValue(null);

    const response = await useCase.execute('US78462F1030');

    expect(response.market.performanceByTimeframe.max.points).toEqual([]);
    expect(
      response.profile.returnsByPeriod.every((row) => row.percent === null),
    ).toBe(true);
  });

  it('should return degraded detail when only scalar score is persisted', async () => {
    fundsRepository.findByIsin.mockResolvedValue({
      ...fund,
      materialized: {
        ...fund.materialized,
        scoreBreakdown: null,
      },
    });

    const response = await useCase.execute('US78462F1030');

    expect(response.inversoraScore).toBe(fund.score);
    expect(response.scoringStatus).toBe('warning');
  });

  it('should return 503 when neither score nor breakdown are persisted', async () => {
    fundsRepository.findByIsin.mockResolvedValue({
      ...fund,
      score: null,
      materialized: {
        ...fund.materialized,
        scoreBreakdown: null,
      },
    });

    await expect(useCase.execute('US78462F1030')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('should return 503 when aggregation throws unexpectedly', async () => {
    fundsService.getFundHoldings.mockRejectedValue(
      new Error('database timeout'),
    );

    await expect(useCase.execute('US78462F1030')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('should omit rank when persisted peer rank is null', async () => {
    fundsRepository.findByIsin.mockResolvedValue({
      ...fund,
      materialized: {
        ...fund.materialized,
        peerRank: null,
      },
    });

    const response = await useCase.execute('US78462F1030');

    expect(response.rank).toBeUndefined();
  });

  it('should expose persisted peer rank from materialized fields', async () => {
    const response = await useCase.execute('US78462F1030');

    expect(response.rank).toBe(2);
  });

  it('should build chart series from a single stored price history', async () => {
    fundPricesService.getHistory.mockResolvedValue([
      { date: '2025-06-01', close: 100, open: 100, high: 100, low: 100 },
      { date: '2026-06-01', close: 110, open: 110, high: 110, low: 110 },
    ]);
    fundPricesService.getLatestDate.mockResolvedValue('2026-06-01');

    const response = await useCase.execute('US78462F1030');

    expect(
      response.market.performanceByTimeframe['1y'].points.length,
    ).toBeGreaterThan(0);
    expect(
      response.market.performanceByTimeframe['3y'].points.length,
    ).toBeGreaterThan(0);
  });

  it('should rethrow catalog visibility errors from aggregation', async () => {
    fundsRepository.findByIsin.mockResolvedValue({
      ...fund,
      catalogVisibility: 'quarantined',
      isin: null,
    });

    await expect(useCase.execute('US78462F1030')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should rethrow nested HTTP errors without wrapping them as 503', async () => {
    fundsService.getFundCountryExposure.mockRejectedValue(
      new NotFoundException('composition missing'),
    );

    await expect(useCase.execute('US78462F1030')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should aggregate fund detail for a valid ISIN', async () => {
    const response = await useCase.execute('US78462F1030');

    expect(response.fund.isin).toBe('US78462F1030');
    expect(response.inversoraScore).toBe(82);
    expect(response.scoredBreakdown).toHaveLength(6);
    expect(response.market.performanceByTimeframe['1y']).toBeDefined();
    expect(response.profile.exposureByTab.sectorial).toEqual([]);
  });
});

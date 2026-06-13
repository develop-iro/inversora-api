import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FundsRepository } from '../../funds/repositories/funds.repository';
import { FundCompositionService } from '../../funds/services/fund-composition.service';
import { FundPricesService } from '../../funds/services/fund-prices.service';
import { FundsService } from '../../funds/services/funds.service';
import { ScoringService } from '../../scoring/services/scoring.service';
import { FundDetailService } from './fund-detail.service';

const fund = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  symbol: 'SPY',
  isin: 'US78462F1030',
  name: 'State Street SPDR S&P 500 ETF Trust',
  provider: 'financial-modeling-prep' as const,
  category: 'index' as const,
  currency: 'USD',
  benchmark: 'S&P 500',
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
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
};

const emptyChart = {
  fundId: fund.id,
  period: '1Y' as const,
  from: '2025-01-01',
  to: '2026-01-01',
  asOf: '2026-01-01',
  points: [],
};

describe('FundDetailService', () => {
  let service: FundDetailService;
  let fundsRepository: {
    findByIsin: jest.Mock;
    findById: jest.Mock;
    findAll: jest.Mock;
  };
  let fundsService: {
    getFundChart: jest.Mock;
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
  let scoringService: {
    calculateScoreForFundId: jest.Mock;
  };

  beforeEach(async () => {
    fundsRepository = {
      findByIsin: jest.fn().mockResolvedValue(fund),
      findById: jest.fn().mockResolvedValue(fund),
      findAll: jest.fn().mockResolvedValue([fund]),
    };
    fundsService = {
      getFundChart: jest.fn().mockResolvedValue(emptyChart),
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
    scoringService = {
      calculateScoreForFundId: jest.fn().mockResolvedValue({
        score: 82,
        version: 'mvp-1',
        breakdown: {
          riskAdjustedReturn: {
            points: 30,
            maxPoints: 40,
            label: 'Rentabilidad ajustada al riesgo',
          },
          risk: { points: 14, maxPoints: 20, label: 'Riesgo' },
          cost: { points: 12, maxPoints: 15, label: 'Comisión anual' },
          diversification: {
            points: 8,
            maxPoints: 10,
            label: 'Diversificación',
          },
          fundSize: {
            points: 9,
            maxPoints: 10,
            label: 'Tamaño del fondo',
          },
          age: { points: 4, maxPoints: 5, label: 'Antigüedad' },
        },
        summary: 'Score sólido.',
        warnings: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundDetailService,
        { provide: FundsRepository, useValue: fundsRepository },
        { provide: FundsService, useValue: fundsService },
        { provide: FundPricesService, useValue: fundPricesService },
        { provide: FundCompositionService, useValue: fundCompositionService },
        { provide: ScoringService, useValue: scoringService },
      ],
    }).compile();

    service = module.get<FundDetailService>(FundDetailService);
  });

  it('should reject invalid ISIN formats', async () => {
    await expect(service.getFundDetailByIsin('INVALID')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should return 404 when the fund does not exist', async () => {
    fundsRepository.findByIsin.mockResolvedValue(null);

    await expect(
      service.getFundDetailByIsin('US78462F1030'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should return 404 when the persisted fund has a null ISIN', async () => {
    fundsRepository.findByIsin.mockResolvedValue({ ...fund, isin: null });

    await expect(
      service.getFundDetailByIsin('US78462F1030'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should build detail when price history is empty', async () => {
    fundPricesService.getHistory.mockResolvedValue([]);
    fundPricesService.getLatestDate.mockResolvedValue(null);

    const response = await service.getFundDetailByIsin('US78462F1030');

    expect(response.market.performanceByTimeframe.max.points).toEqual([]);
    expect(
      response.profile.returnsByPeriod.every((row) => row.percent === null),
    ).toBe(true);
  });

  it('should return 503 when score aggregation fails', async () => {
    scoringService.calculateScoreForFundId.mockResolvedValue(null);

    await expect(
      service.getFundDetailByIsin('US78462F1030'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('should return 503 when aggregation throws unexpectedly', async () => {
    fundsService.getFundChart.mockRejectedValue(new Error('database timeout'));

    await expect(
      service.getFundDetailByIsin('US78462F1030'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('should omit rank when the fund is outside the scored peer group', async () => {
    fundsRepository.findAll.mockResolvedValue([]);

    const response = await service.getFundDetailByIsin('US78462F1030');

    expect(response.rank).toBeUndefined();
  });

  it('should omit rank when the fund cannot be reloaded for ranking', async () => {
    fundsRepository.findById.mockResolvedValue(null);

    const response = await service.getFundDetailByIsin('US78462F1030');

    expect(response.rank).toBeUndefined();
  });

  it('should calculate rank among scored peers in the same benchmark', async () => {
    fundsRepository.findAll.mockResolvedValue([
      fund,
      {
        ...fund,
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        score: 90,
      },
      {
        ...fund,
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        benchmark: 'MSCI World',
        score: 75,
      },
      {
        ...fund,
        id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
        score: null,
      },
    ]);

    const response = await service.getFundDetailByIsin('US78462F1030');

    expect(response.rank).toBe(2);
  });

  it('should aggregate fund detail for a valid ISIN', async () => {
    const response = await service.getFundDetailByIsin('US78462F1030');

    expect(response.fund.isin).toBe('US78462F1030');
    expect(response.inversoraScore).toBe(82);
    expect(response.scoredBreakdown).toHaveLength(6);
    expect(response.market.performanceByTimeframe['1y']).toBeDefined();
    expect(response.profile.exposureByTab.sectorial).toEqual([]);
    expect(scoringService.calculateScoreForFundId).toHaveBeenCalledWith(
      fund.id,
    );
  });
});

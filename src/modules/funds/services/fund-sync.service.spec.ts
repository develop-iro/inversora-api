import { Test, TestingModule } from '@nestjs/testing';
import { FinancialModelingPrepProvider } from '../../providers/financial-modeling-prep/financial-modeling-prep.provider';
import { FundsRepository } from '../repositories/funds.repository';
import { CatalogVisibilityService } from './catalog-visibility.service';
import { FundPriceSyncService } from './fund-price-sync.service';
import { FundSyncService } from './fund-sync.service';

describe('FundSyncService', () => {
  let service: FundSyncService;
  let fmpProvider: { getFundProfile: jest.Mock };
  let fundsRepository: { upsert: jest.Mock };
  let fundPriceSyncService: { syncFromFmp: jest.Mock };
  let catalogVisibilityService: { applyAutomaticVisibilityRules: jest.Mock };

  const persistedFund = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    symbol: 'SPY',
    isin: 'US78462F1030',
    name: 'State Street SPDR S&P 500 ETF Trust',
    provider: 'financial-modeling-prep',
    category: 'index',
    vehicle: 'etf',
    currency: 'USD',
    benchmark: 'S&P 500',
    metrics: {
      volatility: null,
      drawdown: null,
      ter: 0.0945,
      aum: 520_000_000_000,
      per: null,
      dividendYield: null,
      trackingError: null,
    },
    riskLevel: null,
    score: null,
    catalogVisibility: 'visible' as const,
    editorial: { badge: '', themeLabel: '', idealForBeginners: false },
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-02-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    fmpProvider = {
      getFundProfile: jest.fn().mockResolvedValue({
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        isin: 'US78462F1030',
        expenseRatio: 0.0945,
        assetsUnderManagement: 520_000_000_000,
        currency: 'USD',
        vehicle: 'etf',
        benchmark: 'S&P 500',
      }),
    };
    fundsRepository = {
      upsert: jest.fn().mockResolvedValue({
        fund: persistedFund,
        created: true,
      }),
    };
    fundPriceSyncService = {
      syncFromFmp: jest.fn().mockResolvedValue({
        fundId: persistedFund.id,
        symbol: 'SPY',
        pricesSynced: 2,
        from: '2024-01-01',
        to: '2024-01-31',
        upToDate: false,
      }),
    };
    catalogVisibilityService = {
      applyAutomaticVisibilityRules: jest
        .fn()
        .mockImplementation((fund: typeof persistedFund) =>
          Promise.resolve(fund),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundSyncService,
        {
          provide: FinancialModelingPrepProvider,
          useValue: fmpProvider,
        },
        {
          provide: FundsRepository,
          useValue: fundsRepository,
        },
        {
          provide: FundPriceSyncService,
          useValue: fundPriceSyncService,
        },
        {
          provide: CatalogVisibilityService,
          useValue: catalogVisibilityService,
        },
      ],
    }).compile();

    service = module.get<FundSyncService>(FundSyncService);
  });

  it('should sync normalized fund metadata from FMP into PostgreSQL', async () => {
    await expect(service.syncFromFmp('spy')).resolves.toEqual({
      fund: persistedFund,
      created: true,
    });

    expect(fmpProvider.getFundProfile).toHaveBeenCalledWith('SPY');
    expect(fundsRepository.upsert).toHaveBeenCalledTimes(1);
    expect(fundsRepository.upsert).toHaveBeenCalledWith(expect.any(Object));

    type UpsertPayload = {
      symbol: string;
      provider: string;
      category: string;
      currency: string;
      benchmark: string;
      metrics: {
        ter: number;
        aum: number;
      };
    };

    const upsertCalls = fundsRepository.upsert.mock.calls as Array<
      [UpsertPayload]
    >;
    const upsertPayload = upsertCalls[0]?.[0];

    expect(upsertPayload).toMatchObject({
      symbol: 'SPY',
      provider: 'financial-modeling-prep',
      category: 'index',
      vehicle: 'etf',
      currency: 'USD',
      benchmark: 'S&P 500',
      metrics: {
        ter: 0.0945,
        aum: 520_000_000_000,
      },
    });
    expect(fundPriceSyncService.syncFromFmp).not.toHaveBeenCalled();
    expect(
      catalogVisibilityService.applyAutomaticVisibilityRules,
    ).toHaveBeenCalledWith(persistedFund);
  });

  it('should delegate price history sync when includePrices is enabled', async () => {
    await expect(
      service.syncFromFmp('SPY', {
        includePrices: true,
        historyFrom: '2024-01-01',
        historyTo: '2024-01-31',
      }),
    ).resolves.toEqual({
      fund: persistedFund,
      created: true,
      pricesSynced: 2,
    });

    expect(fundPriceSyncService.syncFromFmp).toHaveBeenCalledWith('SPY', {
      from: '2024-01-01',
      to: '2024-01-31',
      incremental: true,
    });
  });

  it('should default incremental price sync to true when requested', async () => {
    await service.syncFromFmp('SPY', {
      includePrices: true,
      incrementalPrices: true,
    });

    expect(fundPriceSyncService.syncFromFmp).toHaveBeenCalledWith('SPY', {
      from: undefined,
      to: undefined,
      incremental: true,
    });
  });
});

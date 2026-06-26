import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from '../../../shared/config/config.service';
import { validateEnv } from '../../../shared/config/env.schema';
import { FundsRepository } from '../repositories/funds.repository';
import { ScoringService } from '../../scoring/services/scoring.service';
import { FundCompositionSyncService } from './fund-composition-sync.service';
import { FundDailySyncService } from './fund-daily-sync.service';
import { FundDiscoveryService } from './fund-discovery.service';
import { FundPriceSyncService } from './fund-price-sync.service';
import { FundSyncService } from './fund-sync.service';

const validEnv = {
  PORT: '3000',
  NODE_ENV: 'development',
  POSTGRES_USER: 'inversora',
  POSTGRES_PASSWORD: 'inversora',
  POSTGRES_DB: 'inversora',
  POSTGRES_HOST: 'localhost',
  POSTGRES_PORT: '5432',
  DATABASE_URL: 'postgresql://inversora:inversora@localhost:5432/inversora',
  FMP_API_KEY: 'test-fmp-api-key',
  SYNC_FUND_SYMBOLS: 'SPY, QQQ',
  SYNC_COMPOSITION_ENABLED: 'true',
};

import type { FundDiscoveryOptions } from './fund-discovery.service';

function createFundDiscoveryMock(symbols: readonly string[] = ['SPY', 'QQQ']): {
  resolveSyncSymbols: jest.Mock<Promise<string[]>, [FundDiscoveryOptions?]>;
} {
  return {
    resolveSyncSymbols: jest.fn(
      (options?: FundDiscoveryOptions): Promise<string[]> => {
        if (options?.explicitSymbols && options.explicitSymbols.length > 0) {
          return Promise.resolve(
            options.explicitSymbols.map((symbol) =>
              symbol.trim().toUpperCase(),
            ),
          );
        }

        if (symbols.length > 0) {
          return Promise.resolve([...symbols]);
        }

        return Promise.resolve([]);
      },
    ),
  };
}

describe('FundDailySyncService', () => {
  let service: FundDailySyncService;
  let fundSyncService: { syncFromFmp: jest.Mock };
  let fundPriceSyncService: { syncFromFmp: jest.Mock };
  let fundCompositionSyncService: { syncFromFmp: jest.Mock };
  let fundsRepository: { findAll: jest.Mock };
  let fundDiscoveryService: { resolveSyncSymbols: jest.Mock };
  let scoringService: { recalculateAllScores: jest.Mock };

  beforeEach(async () => {
    fundSyncService = {
      syncFromFmp: jest.fn().mockResolvedValue({
        created: false,
      }),
    };
    fundPriceSyncService = {
      syncFromFmp: jest.fn().mockResolvedValue({
        pricesSynced: 1,
        upToDate: false,
      }),
    };
    fundCompositionSyncService = {
      syncFromFmp: jest.fn().mockResolvedValue({
        asOf: '2024-01-31',
        holdingsSynced: 3,
        allocationsSynced: 6,
      }),
    };
    fundsRepository = {
      findAll: jest.fn(),
    };
    fundDiscoveryService = createFundDiscoveryMock();
    scoringService = {
      recalculateAllScores: jest.fn().mockResolvedValue({
        total: 2,
        updated: 2,
        results: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => validateEnv(validEnv)],
        }),
      ],
      providers: [
        AppConfigService,
        FundDailySyncService,
        {
          provide: FundsRepository,
          useValue: fundsRepository,
        },
        {
          provide: FundSyncService,
          useValue: fundSyncService,
        },
        {
          provide: FundPriceSyncService,
          useValue: fundPriceSyncService,
        },
        {
          provide: FundCompositionSyncService,
          useValue: fundCompositionSyncService,
        },
        {
          provide: FundDiscoveryService,
          useValue: fundDiscoveryService,
        },
        {
          provide: ScoringService,
          useValue: scoringService,
        },
      ],
    }).compile();

    service = module.get<FundDailySyncService>(FundDailySyncService);
  });

  it('should sync configured symbols sequentially', async () => {
    await expect(service.runDailySync()).resolves.toEqual({
      total: 2,
      succeeded: 2,
      failed: 0,
      results: [
        {
          symbol: 'SPY',
          status: 'success',
          fundCreated: false,
          pricesSynced: 1,
          upToDate: false,
          holdingsSynced: 3,
          allocationsSynced: 6,
          compositionAsOf: '2024-01-31',
        },
        {
          symbol: 'QQQ',
          status: 'success',
          fundCreated: false,
          pricesSynced: 1,
          upToDate: false,
          holdingsSynced: 3,
          allocationsSynced: 6,
          compositionAsOf: '2024-01-31',
        },
      ],
      scoring: {
        status: 'success',
        total: 2,
        updated: 2,
      },
    });

    expect(fundSyncService.syncFromFmp).toHaveBeenNthCalledWith(1, 'SPY');
    expect(fundSyncService.syncFromFmp).toHaveBeenNthCalledWith(2, 'QQQ');
    expect(fundPriceSyncService.syncFromFmp).toHaveBeenCalledWith('SPY', {
      incremental: true,
    });
    expect(fundCompositionSyncService.syncFromFmp).toHaveBeenNthCalledWith(
      1,
      'SPY',
    );
    expect(fundCompositionSyncService.syncFromFmp).toHaveBeenNthCalledWith(
      2,
      'QQQ',
    );
    expect(fundsRepository.findAll).not.toHaveBeenCalled();
    expect(scoringService.recalculateAllScores).toHaveBeenCalledTimes(1);
  });

  it('should fall back to persisted funds when no symbols are configured', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () =>
              validateEnv({
                ...validEnv,
                SYNC_FUND_SYMBOLS: '',
              }),
          ],
        }),
      ],
      providers: [
        AppConfigService,
        FundDailySyncService,
        {
          provide: FundsRepository,
          useValue: fundsRepository,
        },
        {
          provide: FundSyncService,
          useValue: fundSyncService,
        },
        {
          provide: FundPriceSyncService,
          useValue: fundPriceSyncService,
        },
        {
          provide: FundCompositionSyncService,
          useValue: fundCompositionSyncService,
        },
        {
          provide: FundDiscoveryService,
          useValue: createFundDiscoveryMock([]),
        },
        {
          provide: ScoringService,
          useValue: scoringService,
        },
      ],
    }).compile();

    service = module.get<FundDailySyncService>(FundDailySyncService);
    fundsRepository.findAll.mockResolvedValue([
      { symbol: 'VTI' },
      { symbol: 'SPY' },
    ]);

    await expect(service.runDailySync()).resolves.toMatchObject({
      total: 2,
      succeeded: 2,
      failed: 0,
      scoring: {
        status: 'success',
        total: 2,
        updated: 2,
      },
    });

    expect(fundsRepository.findAll).toHaveBeenCalled();
    expect(fundSyncService.syncFromFmp).toHaveBeenNthCalledWith(1, 'VTI');
  });

  it('should continue syncing remaining symbols when one symbol fails', async () => {
    fundSyncService.syncFromFmp
      .mockRejectedValueOnce(new Error('Provider unavailable'))
      .mockResolvedValueOnce({ created: true });

    await expect(service.runDailySync()).resolves.toEqual({
      total: 2,
      succeeded: 1,
      failed: 1,
      results: [
        {
          symbol: 'SPY',
          status: 'failed',
          error: 'Provider unavailable',
        },
        {
          symbol: 'QQQ',
          status: 'success',
          fundCreated: true,
          pricesSynced: 1,
          upToDate: false,
          holdingsSynced: 3,
          allocationsSynced: 6,
          compositionAsOf: '2024-01-31',
        },
      ],
      scoring: {
        status: 'success',
        total: 2,
        updated: 2,
      },
    });
  });

  it('should report scoring failure without failing the daily sync run', async () => {
    scoringService.recalculateAllScores.mockRejectedValueOnce(
      new Error('Scoring unavailable'),
    );

    await expect(service.runDailySync()).resolves.toMatchObject({
      succeeded: 2,
      scoring: {
        status: 'failed',
        error: 'Scoring unavailable',
      },
    });
  });

  it('should stringify non-error scoring failures', async () => {
    scoringService.recalculateAllScores.mockRejectedValueOnce(
      'Scoring unavailable',
    );

    await expect(service.runDailySync()).resolves.toMatchObject({
      scoring: {
        status: 'failed',
        error: 'Scoring unavailable',
      },
    });
  });

  it('should stringify non-error symbol sync failures', async () => {
    fundSyncService.syncFromFmp.mockRejectedValueOnce('Provider unavailable');

    const result = await service.runDailySync();

    expect(result.results[0]).toEqual({
      symbol: 'SPY',
      status: 'failed',
      error: 'Provider unavailable',
    });
  });

  it('should skip sync when no symbols are configured and no funds exist', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () =>
              validateEnv({
                ...validEnv,
                SYNC_FUND_SYMBOLS: '',
              }),
          ],
        }),
      ],
      providers: [
        AppConfigService,
        FundDailySyncService,
        {
          provide: FundsRepository,
          useValue: fundsRepository,
        },
        {
          provide: FundSyncService,
          useValue: fundSyncService,
        },
        {
          provide: FundPriceSyncService,
          useValue: fundPriceSyncService,
        },
        {
          provide: FundCompositionSyncService,
          useValue: fundCompositionSyncService,
        },
        {
          provide: FundDiscoveryService,
          useValue: createFundDiscoveryMock([]),
        },
        {
          provide: ScoringService,
          useValue: scoringService,
        },
      ],
    }).compile();

    service = module.get<FundDailySyncService>(FundDailySyncService);
    fundsRepository.findAll.mockResolvedValueOnce([]);
    scoringService.recalculateAllScores.mockResolvedValueOnce({
      total: 0,
      updated: 0,
      results: [],
    });

    await expect(service.runDailySync()).resolves.toEqual({
      total: 0,
      succeeded: 0,
      failed: 0,
      results: [],
      scoring: { status: 'skipped' },
    });

    expect(fundSyncService.syncFromFmp).not.toHaveBeenCalled();
    expect(scoringService.recalculateAllScores).not.toHaveBeenCalled();
  });

  it('should skip scoring when recalculation finds no funds after sync', async () => {
    scoringService.recalculateAllScores.mockResolvedValueOnce({
      total: 0,
      updated: 0,
      results: [],
    });

    await expect(service.runDailySync()).resolves.toMatchObject({
      scoring: { status: 'skipped' },
    });
  });

  it('should run only selected manual sync steps', async () => {
    await service.runManualSync({
      symbols: ['SPY'],
      steps: {
        metadata: false,
        prices: true,
        composition: false,
        scoring: false,
      },
      incrementalPrices: false,
      historyFrom: '2024-01-01',
      historyTo: '2024-01-31',
    });

    expect(fundSyncService.syncFromFmp).not.toHaveBeenCalled();
    expect(fundPriceSyncService.syncFromFmp).toHaveBeenCalledWith('SPY', {
      incremental: false,
      from: '2024-01-01',
      to: '2024-01-31',
    });
    expect(fundCompositionSyncService.syncFromFmp).not.toHaveBeenCalled();
    expect(scoringService.recalculateAllScores).not.toHaveBeenCalled();
  });

  it('should run scoring only when requested without symbol sync', async () => {
    const result = await service.runManualSync({
      steps: {
        metadata: false,
        prices: false,
        composition: false,
        scoring: true,
      },
    });

    expect(result.total).toBe(0);
    expect(result.results).toEqual([]);
    expect(fundSyncService.syncFromFmp).not.toHaveBeenCalled();
    expect(scoringService.recalculateAllScores).toHaveBeenCalledTimes(1);
  });

  it('should include execution metadata in manual sync responses', async () => {
    const result = await service.runManualSync({ symbols: ['SPY'] });

    expect(result.runId).toEqual(expect.any(String));
    expect(result.startedAt).toEqual(expect.any(String));
    expect(result.finishedAt).toEqual(expect.any(String));
    expect(result.durationMs).toEqual(expect.any(Number));
    expect(result.steps).toEqual({
      metadata: true,
      prices: true,
      composition: true,
      scoring: true,
    });
  });
});

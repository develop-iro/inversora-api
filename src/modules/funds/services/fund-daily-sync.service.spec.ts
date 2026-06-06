import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from '../../../shared/config/config.service';
import { validateEnv } from '../../../shared/config/env.schema';
import { FundsRepository } from '../repositories/funds.repository';
import { FundDailySyncService } from './fund-daily-sync.service';
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
};

describe('FundDailySyncService', () => {
  let service: FundDailySyncService;
  let fundSyncService: { syncFromFmp: jest.Mock };
  let fundPriceSyncService: { syncFromFmp: jest.Mock };
  let fundsRepository: { findAll: jest.Mock };

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
    fundsRepository = {
      findAll: jest.fn(),
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
        },
        {
          symbol: 'QQQ',
          status: 'success',
          fundCreated: false,
          pricesSynced: 1,
          upToDate: false,
        },
      ],
    });

    expect(fundSyncService.syncFromFmp).toHaveBeenNthCalledWith(1, 'SPY');
    expect(fundSyncService.syncFromFmp).toHaveBeenNthCalledWith(2, 'QQQ');
    expect(fundPriceSyncService.syncFromFmp).toHaveBeenCalledWith('SPY', {
      incremental: true,
    });
    expect(fundsRepository.findAll).not.toHaveBeenCalled();
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
        },
      ],
    });
  });
});

import { ConfigModule } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AdminSyncController } from '../src/modules/admin/controllers/admin-sync.controller';
import { AdminApiKeyGuard } from '../src/modules/admin/guards/admin-api-key.guard';
import { FundDailySyncService } from '../src/modules/funds/services/fund-daily-sync.service';
import { AppConfigService } from '../src/shared/config/config.service';
import { validateEnv } from '../src/shared/config/env.schema';

const adminEnv = {
  PORT: '3000',
  NODE_ENV: 'test',
  POSTGRES_USER: 'inversora',
  POSTGRES_PASSWORD: 'inversora',
  POSTGRES_DB: 'inversora',
  POSTGRES_HOST: 'localhost',
  POSTGRES_PORT: '5432',
  DATABASE_URL: 'postgresql://inversora:inversora@localhost:5432/inversora',
  FMP_API_KEY: 'test-fmp-api-key',
  ADMIN_SYNC_ENABLED: 'true',
  ADMIN_API_KEY: 'test-admin-key',
};

describe('Admin sync (e2e)', () => {
  let app: INestApplication<App>;
  let fundDailySyncService: { runManualSync: jest.Mock };

  beforeEach(async () => {
    fundDailySyncService = {
      runManualSync: jest.fn().mockResolvedValue({
        runId: 'run-e2e',
        startedAt: '2024-01-01T00:00:00.000Z',
        finishedAt: '2024-01-01T00:00:01.000Z',
        durationMs: 1000,
        steps: {
          metadata: true,
          prices: true,
          composition: true,
          scoring: true,
        },
        total: 1,
        succeeded: 1,
        failed: 0,
        results: [
          {
            symbol: 'SPY',
            status: 'success',
          },
        ],
        scoring: { status: 'skipped' },
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => validateEnv(adminEnv)],
        }),
      ],
      controllers: [AdminSyncController],
      providers: [
        AppConfigService,
        AdminApiKeyGuard,
        {
          provide: FundDailySyncService,
          useValue: fundDailySyncService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /admin/sync should require authentication', () => {
    return request(app.getHttpServer()).post('/admin/sync').expect(401);
  });

  it('POST /admin/sync should run manual sync with a valid admin key', async () => {
    await request(app.getHttpServer())
      .post('/admin/sync')
      .set('X-Admin-Api-Key', 'test-admin-key')
      .send({ symbols: ['SPY'], steps: { scoring: false } })
      .expect(201)
      .expect({
        runId: 'run-e2e',
        startedAt: '2024-01-01T00:00:00.000Z',
        finishedAt: '2024-01-01T00:00:01.000Z',
        durationMs: 1000,
        steps: {
          metadata: true,
          prices: true,
          composition: true,
          scoring: true,
        },
        total: 1,
        succeeded: 1,
        failed: 0,
        results: [
          {
            symbol: 'SPY',
            status: 'success',
          },
        ],
        scoring: { status: 'skipped' },
      });

    expect(fundDailySyncService.runManualSync).toHaveBeenCalledWith({
      symbols: ['SPY'],
      steps: { scoring: false },
      incrementalPrices: undefined,
      historyFrom: undefined,
      historyTo: undefined,
    });
  });

  it('POST /admin/sync should return 404 when admin sync is disabled', async () => {
    await app.close();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () =>
              validateEnv({
                ...adminEnv,
                ADMIN_SYNC_ENABLED: 'false',
              }),
          ],
        }),
      ],
      controllers: [AdminSyncController],
      providers: [
        AppConfigService,
        AdminApiKeyGuard,
        {
          provide: FundDailySyncService,
          useValue: fundDailySyncService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    return request(app.getHttpServer())
      .post('/admin/sync')
      .set('X-Admin-Api-Key', 'test-admin-key')
      .send({})
      .expect(404);
  });
});

import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from './config.service';
import { validateEnv } from './env.schema';

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
};

describe('AppConfigService', () => {
  let service: AppConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => validateEnv(validEnv)],
        }),
      ],
      providers: [AppConfigService],
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
  });

  it('should expose typed environment values', () => {
    expect(service.port).toBe(3000);
    expect(service.nodeEnv).toBe('development');
    expect(service.postgresUser).toBe('inversora');
    expect(service.postgresPassword).toBe('inversora');
    expect(service.postgresDb).toBe('inversora');
    expect(service.postgresHost).toBe('localhost');
    expect(service.postgresPort).toBe(5432);
    expect(service.databaseUrl).toBe(
      'postgresql://inversora:inversora@localhost:5432/inversora',
    );
    expect(service.isProduction).toBe(false);
    expect(service.httpClientTimeoutMs).toBe(10_000);
    expect(service.httpClientMaxRetries).toBe(3);
    expect(service.httpClientRetryDelayMs).toBe(500);
    expect(service.fmpApiKey).toBe('test-fmp-api-key');
    expect(service.fmpBaseUrl).toBe('https://financialmodelingprep.com');
    expect(service.fmpUsesMocks).toBe(true);
    expect(service.fmpSaveFixtures).toBe(false);
    expect(service.syncSchedulerEnabled).toBe(false);
    expect(service.syncCronExpression).toBe('0 6 * * *');
    expect(service.syncFundSymbols).toEqual([]);
    expect(service.adminSyncEnabled).toBe(false);
    expect(service.adminCatalogEnabled).toBe(false);
    expect(service.adminApiEnabled).toBe(false);
    expect(service.corsOrigins).toEqual([
      'http://localhost:8081',
      'http://127.0.0.1:8081',
      'http://localhost:19006',
      'http://127.0.0.1:19006',
    ]);
    expect(service.corsEnabled).toBe(true);
    expect(service.adminApiKey).toBeUndefined();
  });

  it('should expose admin catalog and combined admin API flags', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () =>
              validateEnv({
                ...validEnv,
                ADMIN_CATALOG_ENABLED: 'true',
                ADMIN_API_KEY: 'local-dev-admin-key',
              }),
          ],
        }),
      ],
      providers: [AppConfigService],
    }).compile();

    service = module.get(AppConfigService);
    expect(service.adminCatalogEnabled).toBe(true);
    expect(service.adminApiEnabled).toBe(true);
    expect(service.adminApiKey).toBe('local-dev-admin-key');
  });

  it('should expose production mode from node env', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () =>
              validateEnv({
                ...validEnv,
                NODE_ENV: 'production',
              }),
          ],
        }),
      ],
      providers: [AppConfigService],
    }).compile();

    service = module.get(AppConfigService);
    expect(service.isProduction).toBe(true);
  });
});

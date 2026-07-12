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
    expect(service.apiBodyLimit).toBe('100kb');
    expect(service.appEnv).toBe('local');
    expect(service.isProductionDeployment).toBe(false);
    expect(service.isQaDeployment).toBe(false);
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
    expect(service.syncEtfListDiscoveryEnabled).toBe(false);
    expect(service.syncDiscoveryLimit).toBe(50);
    expect(service.syncDiscoveryOffset).toBe(0);
    expect(service.syncDiscoveryMode).toBe('all');
    expect(service.syncCompositionEnabled).toBe(false);
    expect(service.adminSyncEnabled).toBe(false);
    expect(service.adminCatalogEnabled).toBe(false);
    expect(service.adminApiEnabled).toBe(false);
    expect(service.corsOrigins).toEqual([
      'http://localhost:8081',
      'http://127.0.0.1:8081',
      'http://localhost:8082',
      'http://127.0.0.1:8082',
      'http://localhost:19000',
      'http://127.0.0.1:19000',
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

  it('should expose production deployment profile flags', async () => {
    const proBaseEnv = { ...validEnv };
    delete proBaseEnv.NODE_ENV;

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () =>
              validateEnv({
                ...proBaseEnv,
                APP_ENV: 'pro',
              }),
          ],
        }),
      ],
      providers: [AppConfigService],
    }).compile();

    service = module.get(AppConfigService);
    expect(service.appEnv).toBe('pro');
    expect(service.isProductionDeployment).toBe(true);
    expect(service.isQaDeployment).toBe(false);
    expect(service.isProduction).toBe(true);
    expect(service.syncSchedulerEnabled).toBe(true);
    expect(service.adminSyncEnabled).toBe(false);
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

  it('should expose assistant configuration when enabled', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () =>
              validateEnv({
                ...validEnv,
                ASSISTANT_ENABLED: 'true',
                OPENAI_API_KEY: 'test-openai-key',
                ASSISTANT_PROMPT_VERSION: 'sora-v2',
                ASSISTANT_CACHE_TTL_DAYS: '30',
              }),
          ],
        }),
      ],
      providers: [AppConfigService],
    }).compile();

    service = module.get(AppConfigService);
    expect(service.assistantEnabled).toBe(true);
    expect(service.assistantRuntime).toBe('nestjs');
    expect(service.assistantAgentBaseUrl).toBe('http://localhost:8001');
    expect(service.assistantAgentTimeoutMs).toBe(10_000);
    expect(service.assistantInternalApiKey).toBeUndefined();
    expect(service.openAiApiKey).toBe('test-openai-key');
    expect(service.openAiModel).toBe('gpt-4o-mini');
    expect(service.assistantPromptVersion).toBe('sora-v2');
    expect(service.assistantCacheTtlDays).toBe(30);
    expect(service.assistantDailyLlmLimit).toBe(0);
    expect(service.assistantMonthlyLlmLimit).toBe(0);
    expect(service.assistantRateLimitMaxRequests).toBe(30);
    expect(service.assistantRateLimitWindowSeconds).toBe(60);
  });

  it('should expose ETF discovery sync configuration', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () =>
              validateEnv({
                ...validEnv,
                SYNC_ETF_LIST_DISCOVERY: 'true',
                SYNC_DISCOVERY_LIMIT: '25',
                SYNC_DISCOVERY_OFFSET: '10',
                SYNC_DISCOVERY_MODE: 'indexed',
                SYNC_COMPOSITION_ENABLED: 'true',
              }),
          ],
        }),
      ],
      providers: [AppConfigService],
    }).compile();

    service = module.get(AppConfigService);
    expect(service.syncEtfListDiscoveryEnabled).toBe(true);
    expect(service.syncDiscoveryLimit).toBe(25);
    expect(service.syncDiscoveryOffset).toBe(10);
    expect(service.syncDiscoveryMode).toBe('indexed');
    expect(service.syncCompositionEnabled).toBe(true);
  });

  it('should expose security and throttling configuration', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () =>
              validateEnv({
                ...validEnv,
                SWAGGER_ENABLED: 'false',
                THROTTLE_TTL_SECONDS: '30',
                THROTTLE_LIMIT: '90',
                THROTTLE_ASSISTANT_LIMIT: '15',
                THROTTLE_ANALYTICS_LIMIT: '40',
                THROTTLE_DEVICE_REGISTER_LIMIT: '8',
                THROTTLE_REDIS_URL: 'redis://localhost:6379',
                ASSISTANT_AGENT_API_KEY: 'change-me-agent-key',
                BRANDFETCH_CLIENT_ID: 'brandfetch-id',
              }),
          ],
        }),
      ],
      providers: [AppConfigService],
    }).compile();

    service = module.get(AppConfigService);
    expect(service.swaggerEnabled).toBe(false);
    expect(service.throttleTtlSeconds).toBe(30);
    expect(service.throttleLimit).toBe(90);
    expect(service.throttleAssistantLimit).toBe(15);
    expect(service.throttleAnalyticsLimit).toBe(40);
    expect(service.throttleDeviceRegisterLimit).toBe(8);
    expect(service.throttleRedisUrl).toBe('redis://localhost:6379');
    expect(service.assistantAgentApiKey).toBe('change-me-agent-key');
    expect(service.brandfetchClientId).toBe('brandfetch-id');
  });

  it('should expose assistant LLM and MyInvestor configuration', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () =>
              validateEnv({
                ...validEnv,
                ASSISTANT_LLM_PRIMARY_API_KEY: 'primary-llm-key',
                ASSISTANT_LLM_PRIMARY_BASE_URL: 'https://llm.example.com/v1',
                ASSISTANT_LLM_PRIMARY_MODEL: 'qwen-test',
                ASSISTANT_OPENAI_FALLBACK_ENABLED: 'false',
                ASSISTANT_FALLBACK_CONFIDENCE_THRESHOLD: '0.7',
                MYINVESTOR_MCP_URL: 'https://mcp.example.com',
                MYINVESTOR_DATA_SOURCE: 'mock',
              }),
          ],
        }),
      ],
      providers: [AppConfigService],
    }).compile();

    service = module.get(AppConfigService);
    expect(service.assistantLlmPrimaryApiKey).toBe('primary-llm-key');
    expect(service.assistantLlmPrimaryBaseUrl).toBe(
      'https://llm.example.com/v1',
    );
    expect(service.assistantLlmPrimaryModel).toBe('qwen-test');
    expect(service.assistantOpenAiFallbackEnabled).toBe(false);
    expect(service.assistantFallbackConfidenceThreshold).toBe(0.7);
    expect(service.myInvestorMcpUrl).toBe('https://mcp.example.com');
    expect(service.myInvestorUsesMocks).toBe(true);
  });

  it('should fall back to OPENAI_API_KEY for the primary LLM when dedicated key is absent', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () =>
              validateEnv({
                ...validEnv,
                OPENAI_API_KEY: 'legacy-openai-key',
              }),
          ],
        }),
      ],
      providers: [AppConfigService],
    }).compile();

    service = module.get(AppConfigService);
    expect(service.assistantLlmPrimaryApiKey).toBe('legacy-openai-key');
  });

  it('should throw when no primary LLM key is configured', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => validateEnv({ ...validEnv })],
        }),
      ],
      providers: [AppConfigService],
    }).compile();

    service = module.get(AppConfigService);
    expect(() => service.assistantLlmPrimaryApiKey).toThrow(
      'ASSISTANT_LLM_PRIMARY_API_KEY is not configured',
    );
  });
});

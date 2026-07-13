import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { Test, type TestingModule } from '@nestjs/testing';
import { createPrismaClient } from '../../src/shared/database/create-prisma-client';
import { AppConfigService } from '../../src/shared/config/config.service';
import { validateEnv } from '../../src/shared/config/env.schema';
import { PrismaModule } from '../../src/shared/database/prisma.module';
import type { PrismaService } from '../../src/shared/database/prisma.service';
import { HttpClientModule } from '../../src/shared/http/http-client.module';
import { BffModule } from '../../src/modules/bff/bff.module';
import { FundsModule } from '../../src/modules/funds/funds.module';
import { ProvidersModule } from '../../src/modules/providers/providers.module';
import { ScoringModule } from '../../src/modules/scoring/scoring.module';
import type { Fund } from '../../src/modules/funds/entities/fund.schema';
import type { FundSyncOptions } from '../../src/modules/funds/services/fund-sync.types';
import { FundSyncService } from '../../src/modules/funds/services/fund-sync.service';
import { FundCompositionSyncService } from '../../src/modules/funds/services/fund-composition-sync.service';
import { CatalogVisibilityService } from '../../src/modules/funds/services/catalog-visibility.service';
import { FundsRepository } from '../../src/modules/funds/repositories/funds.repository';
import { ScoringService } from '../../src/modules/scoring/services/scoring.service';

/** Symbol used by committed FMP fixtures and sync integration scenarios. */
export const INTEGRATION_FUND_SYMBOL = 'SPY';

/** Environment values for integration tests. Uses mock FMP fixtures by default. */
export const integrationTestEnv = {
  PORT: process.env.PORT ?? '3000',
  NODE_ENV: 'test',
  POSTGRES_USER: process.env.POSTGRES_USER ?? 'inversora',
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ?? 'inversora',
  POSTGRES_DB: process.env.POSTGRES_DB ?? 'inversora',
  POSTGRES_HOST: process.env.POSTGRES_HOST ?? 'localhost',
  POSTGRES_PORT: process.env.POSTGRES_PORT ?? '5432',
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://inversora:inversora@localhost:5432/inversora',
  HTTP_CLIENT_TIMEOUT_MS: process.env.HTTP_CLIENT_TIMEOUT_MS ?? '10000',
  HTTP_CLIENT_MAX_RETRIES: process.env.HTTP_CLIENT_MAX_RETRIES ?? '3',
  HTTP_CLIENT_RETRY_DELAY_MS: process.env.HTTP_CLIENT_RETRY_DELAY_MS ?? '500',
  FMP_API_KEY: process.env.FMP_API_KEY ?? 'integration-test-fmp-key',
  FMP_BASE_URL: process.env.FMP_BASE_URL ?? 'https://financialmodelingprep.com',
  FMP_DATA_SOURCE: 'mock',
  FMP_SAVE_FIXTURES: 'false',
  SYNC_SCHEDULER_ENABLED: 'false',
  SYNC_CRON_EXPRESSION: '0 6 * * *',
  SYNC_FUND_SYMBOLS: 'SPY',
  SYNC_ETF_LIST_DISCOVERY: 'false',
  SYNC_DISCOVERY_MODE: 'all',
  SYNC_COMPOSITION_ENABLED: 'true',
} as const;

/**
 * Global configuration module used by integration tests.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [() => validateEnv(integrationTestEnv)],
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
class IntegrationTestConfigModule {}

/**
 * Checks whether PostgreSQL is reachable with the integration test connection string.
 *
 * @returns `true` when the database accepts connections.
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  const prisma = createPrismaClient(integrationTestEnv.DATABASE_URL);

  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Builds a Nest testing module wired for provider-level integration scenarios.
 *
 * @returns Compiled testing module with FMP mock configuration.
 */
export async function createProvidersIntegrationModule(): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [IntegrationTestConfigModule, HttpClientModule, ProvidersModule],
  }).compile();
}

/**
 * Builds a Nest testing module wired for PostgreSQL and fund sync scenarios.
 *
 * @returns Compiled testing module with Prisma, providers, and funds domain services.
 */
export async function createFundsIntegrationModule(): Promise<TestingModule> {
  process.env.DATABASE_URL ??= integrationTestEnv.DATABASE_URL;

  return Test.createTestingModule({
    imports: [
      IntegrationTestConfigModule,
      ScheduleModule.forRoot(),
      HttpClientModule,
      PrismaModule,
      ProvidersModule,
      FundsModule,
      ScoringModule,
      BffModule,
    ],
  }).compile();
}

/**
 * Deletes persisted fund rows for a symbol, including cascaded prices and holdings.
 *
 * @param prisma - Active Prisma service instance.
 * @param symbol - Fund ticker symbol to remove.
 */
export async function deleteFundBySymbol(
  prisma: PrismaService,
  symbol: string,
): Promise<void> {
  await prisma.fund.deleteMany({
    where: {
      symbol: symbol.trim().toUpperCase(),
    },
  });
}

/**
 * Syncs a fund from fixtures, optionally loads composition/prices, then scores and
 * promotes it to public catalog visibility for BFF and read API integration tests.
 *
 * @param moduleRef - Active integration testing module.
 * @param symbol - Fund ticker symbol.
 * @param options - Optional metadata, price, and composition sync flags.
 * @returns Persisted fund after scoring and visibility reconciliation.
 */
export async function syncAndPublishIntegrationFund(
  moduleRef: TestingModule,
  symbol: string,
  options: FundSyncOptions & { composition?: boolean } = {},
): Promise<Fund> {
  const fundSyncService = moduleRef.get(FundSyncService);
  const fundCompositionSyncService = moduleRef.get(FundCompositionSyncService);

  const { composition = false, ...syncOptions } = options;
  const syncResult = await fundSyncService.syncFromFmp(symbol, syncOptions);

  if (composition) {
    await fundCompositionSyncService.syncFromFmp(symbol);
  }

  return scoreAndPublishIntegrationFundById(moduleRef, syncResult.fund.id);
}

/**
 * Persists a computed score and promotes a fund to public catalog visibility.
 *
 * @param moduleRef - Active integration testing module.
 * @param fundId - Persisted fund identifier.
 * @returns Fund after scoring and visibility reconciliation.
 */
export async function scoreAndPublishIntegrationFundById(
  moduleRef: TestingModule,
  fundId: string,
): Promise<Fund> {
  const scoringService = moduleRef.get(ScoringService);
  const fundsRepository = moduleRef.get(FundsRepository);
  const catalogVisibilityService = moduleRef.get(CatalogVisibilityService);

  const scoringResult = await scoringService.recalculateAllScores();
  const scoredFund = await fundsRepository.findById(fundId);

  if (
    scoredFund === null ||
    !scoringResult.results.some((result) => result.fundId === fundId)
  ) {
    throw new Error(`Unable to calculate score for fund ${fundId}`);
  }

  return catalogVisibilityService.applyAutomaticVisibilityRules(scoredFund);
}

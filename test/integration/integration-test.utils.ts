import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { AppConfigService } from '../../src/shared/config/config.service';
import { validateEnv } from '../../src/shared/config/env.schema';
import { PrismaModule } from '../../src/shared/database/prisma.module';
import type { PrismaService } from '../../src/shared/database/prisma.service';
import { HttpClientModule } from '../../src/shared/http/http-client.module';
import { FundsModule } from '../../src/modules/funds/funds.module';
import { ProvidersModule } from '../../src/modules/providers/providers.module';

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
  SYNC_FUND_SYMBOLS: '',
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
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: integrationTestEnv.DATABASE_URL,
      },
    },
  });

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
  return Test.createTestingModule({
    imports: [
      IntegrationTestConfigModule,
      ScheduleModule.forRoot(),
      HttpClientModule,
      PrismaModule,
      ProvidersModule,
      FundsModule,
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

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveCorsOrigins } from '../http/cors.config';
import type { Env } from './env.schema';

/**
 * Provides typed access to validated environment variables.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  /** HTTP server port. */
  get port(): number {
    return this.configService.get('PORT', { infer: true });
  }

  /** Application runtime environment. */
  get nodeEnv(): Env['NODE_ENV'] {
    return this.configService.get('NODE_ENV', { infer: true });
  }

  /** PostgreSQL username. */
  get postgresUser(): string {
    return this.configService.get('POSTGRES_USER', { infer: true });
  }

  /** PostgreSQL password. */
  get postgresPassword(): string {
    return this.configService.get('POSTGRES_PASSWORD', { infer: true });
  }

  /** PostgreSQL database name. */
  get postgresDb(): string {
    return this.configService.get('POSTGRES_DB', { infer: true });
  }

  /** PostgreSQL host. */
  get postgresHost(): string {
    return this.configService.get('POSTGRES_HOST', { infer: true });
  }

  /** PostgreSQL port. */
  get postgresPort(): number {
    return this.configService.get('POSTGRES_PORT', { infer: true });
  }

  /** Prisma database connection string. */
  get databaseUrl(): string {
    return this.configService.get('DATABASE_URL', { infer: true });
  }

  /** Whether the application runs in production mode. */
  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  /** Default outbound HTTP request timeout in milliseconds. */
  get httpClientTimeoutMs(): number {
    return this.configService.get('HTTP_CLIENT_TIMEOUT_MS', { infer: true });
  }

  /** Default number of outbound HTTP retry attempts. */
  get httpClientMaxRetries(): number {
    return this.configService.get('HTTP_CLIENT_MAX_RETRIES', { infer: true });
  }

  /** Base delay in milliseconds between outbound HTTP retry attempts. */
  get httpClientRetryDelayMs(): number {
    return this.configService.get('HTTP_CLIENT_RETRY_DELAY_MS', {
      infer: true,
    });
  }

  /** Financial Modeling Prep API key. */
  get fmpApiKey(): string {
    return this.configService.get('FMP_API_KEY', { infer: true });
  }

  /** Financial Modeling Prep API base URL. */
  get fmpBaseUrl(): string {
    return this.configService.get('FMP_BASE_URL', { infer: true });
  }

  /** Whether FMP responses are served from committed fixtures. */
  get fmpUsesMocks(): boolean {
    return (
      this.configService.get('FMP_DATA_SOURCE', { infer: true }) === 'mock'
    );
  }

  /** Whether successful live FMP responses are persisted as fixtures. */
  get fmpSaveFixtures(): boolean {
    return this.configService.get('FMP_SAVE_FIXTURES', { infer: true });
  }

  /** Whether the daily fund sync scheduler is active. */
  get syncSchedulerEnabled(): boolean {
    return this.configService.get('SYNC_SCHEDULER_ENABLED', { infer: true });
  }

  /** Cron expression for the daily fund synchronization job. */
  get syncCronExpression(): string {
    return this.configService.get('SYNC_CRON_EXPRESSION', { infer: true });
  }

  /** Optional fund symbols to sync; empty means all persisted funds. */
  get syncFundSymbols(): readonly string[] {
    return this.configService.get('SYNC_FUND_SYMBOLS', { infer: true });
  }

  /** Whether the manual admin sync endpoint and CLI are available. */
  get adminSyncEnabled(): boolean {
    return this.configService.get('ADMIN_SYNC_ENABLED', { infer: true });
  }

  /** Whether admin catalog visibility endpoints are available. */
  get adminCatalogEnabled(): boolean {
    return this.configService.get('ADMIN_CATALOG_ENABLED', { infer: true });
  }

  /** Whether any authenticated admin API surface is enabled. */
  get adminApiEnabled(): boolean {
    return this.adminSyncEnabled || this.adminCatalogEnabled;
  }

  /** Shared secret for authenticating manual admin requests. */
  get adminApiKey(): string | undefined {
    return this.configService.get('ADMIN_API_KEY', { infer: true });
  }

  /** Allowed browser origins for cross-origin API access. */
  get corsOrigins(): readonly string[] {
    return resolveCorsOrigins(
      this.configService.get('CORS_ORIGINS', { infer: true }),
      this.nodeEnv,
    );
  }

  /** Whether CORS should be enabled for incoming browser requests. */
  get corsEnabled(): boolean {
    return this.corsOrigins.length > 0;
  }

  /** OpenAI API key for the SORA assistant (server-side only). */
  get openAiApiKey(): string | undefined {
    return this.configService.get('OPENAI_API_KEY', { infer: true });
  }

  /** OpenAI model identifier for assistant completions. */
  get openAiModel(): string {
    return this.configService.get('OPENAI_MODEL', { infer: true });
  }

  /** Whether the SORA assistant endpoint is active. */
  get assistantEnabled(): boolean {
    return this.configService.get('ASSISTANT_ENABLED', { infer: true });
  }

  /** Version tag for assistant system prompts (cache invalidation). */
  get assistantPromptVersion(): string {
    return this.configService.get('ASSISTANT_PROMPT_VERSION', { infer: true });
  }

  /** TTL in days for persisted assistant response cache entries. */
  get assistantCacheTtlDays(): number {
    return this.configService.get('ASSISTANT_CACHE_TTL_DAYS', { infer: true });
  }
}

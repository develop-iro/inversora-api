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

  /** Maximum request body size accepted by JSON and URL-encoded parsers. */
  get apiBodyLimit(): string {
    return this.configService.get('API_BODY_LIMIT', { infer: true });
  }

  /** Application runtime environment. */
  get nodeEnv(): Env['NODE_ENV'] {
    return this.configService.get('NODE_ENV', { infer: true });
  }

  /** Deployment profile (`local`, `qa`, `pro`). */
  get appEnv(): Env['APP_ENV'] {
    return this.configService.get('APP_ENV', { infer: true });
  }

  /** Whether the API runs under the production deployment profile. */
  get isProductionDeployment(): boolean {
    return this.appEnv === 'pro';
  }

  /** Whether the API runs under the QA/staging deployment profile. */
  get isQaDeployment(): boolean {
    return this.appEnv === 'qa';
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

  /** MyInvestor MCP server endpoint URL. */
  get myInvestorMcpUrl(): string {
    return this.configService.get('MYINVESTOR_MCP_URL', { infer: true });
  }

  /** Whether MyInvestor responses are served from committed fixtures. */
  get myInvestorUsesMocks(): boolean {
    return (
      this.configService.get('MYINVESTOR_DATA_SOURCE', { infer: true }) ===
      'mock'
    );
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

  /** Whether scheduled sync merges index-tracking symbols from FMP `etf-list`. */
  get syncEtfListDiscoveryEnabled(): boolean {
    return this.configService.get('SYNC_ETF_LIST_DISCOVERY', { infer: true });
  }

  /** Maximum number of discovered ETF symbols to process per sync run. */
  get syncDiscoveryLimit(): number {
    return this.configService.get('SYNC_DISCOVERY_LIMIT', { infer: true });
  }

  /** Offset into the discovered ETF list for batched ingestion. */
  get syncDiscoveryOffset(): number {
    return this.configService.get('SYNC_DISCOVERY_OFFSET', { infer: true });
  }

  /** Whether discovery ingests the full FMP `etf-list` or only index-tracking rows. */
  get syncDiscoveryMode(): 'all' | 'indexed' {
    return this.configService.get('SYNC_DISCOVERY_MODE', { infer: true });
  }

  /** Whether composition sync runs by default (disabled on FMP Starter). */
  get syncCompositionEnabled(): boolean {
    return this.configService.get('SYNC_COMPOSITION_ENABLED', { infer: true });
  }

  /** Maximum calendar years of end-of-day prices kept in PostgreSQL. */
  get fundPricesRetentionYears(): number {
    return this.configService.get('FUND_PRICES_RETENTION_YEARS', {
      infer: true,
    });
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

  /** Primary LLM base URL (OpenAI-compatible, e.g. Qwen/DashScope). */
  get assistantLlmPrimaryBaseUrl(): string | undefined {
    return this.configService.get('ASSISTANT_LLM_PRIMARY_BASE_URL', {
      infer: true,
    });
  }

  /** Primary LLM model identifier (default: Qwen). */
  get assistantLlmPrimaryModel(): string {
    return this.configService.get('ASSISTANT_LLM_PRIMARY_MODEL', {
      infer: true,
    });
  }

  /** Primary LLM API key; falls back to OPENAI_API_KEY for legacy deployments. */
  get assistantLlmPrimaryApiKey(): string {
    const primary = this.configService.get('ASSISTANT_LLM_PRIMARY_API_KEY', {
      infer: true,
    });

    if (primary !== undefined) {
      return primary;
    }

    const legacyOpenAi = this.openAiApiKey;

    if (legacyOpenAi !== undefined) {
      return legacyOpenAi;
    }

    throw new Error('ASSISTANT_LLM_PRIMARY_API_KEY is not configured');
  }

  /** Whether OpenAI is used as fallback when Qwen confidence is low or errors occur. */
  get assistantOpenAiFallbackEnabled(): boolean {
    return this.configService.get('ASSISTANT_OPENAI_FALLBACK_ENABLED', {
      infer: true,
    });
  }

  /** Minimum confidence score required to accept the primary LLM response. */
  get assistantFallbackConfidenceThreshold(): number {
    return this.configService.get('ASSISTANT_FALLBACK_CONFIDENCE_THRESHOLD', {
      infer: true,
    });
  }

  /** Whether the SORA assistant endpoint is active. */
  get assistantEnabled(): boolean {
    return this.configService.get('ASSISTANT_ENABLED', { infer: true });
  }

  /** Runtime used to generate SORA model responses. */
  get assistantRuntime(): Env['ASSISTANT_RUNTIME'] {
    return this.configService.get('ASSISTANT_RUNTIME', { infer: true });
  }

  /** Internal Python agent service base URL. */
  get assistantAgentBaseUrl(): string {
    return this.configService.get('ASSISTANT_AGENT_BASE_URL', { infer: true });
  }

  /** Internal Python agent service request timeout in milliseconds. */
  get assistantAgentTimeoutMs(): number {
    return this.configService.get('ASSISTANT_AGENT_TIMEOUT_MS', {
      infer: true,
    });
  }

  /** Shared secret for authenticating NestJS -> Python agent calls. */
  get assistantAgentApiKey(): string | undefined {
    return this.configService.get('ASSISTANT_AGENT_API_KEY', { infer: true });
  }

  /** Shared secret for internal SORA tool endpoints. */
  get assistantInternalApiKey(): string | undefined {
    return this.configService.get('ASSISTANT_INTERNAL_API_KEY', {
      infer: true,
    });
  }

  /** Maximum public SORA requests allowed per client/window. */
  get assistantRateLimitMaxRequests(): number {
    return this.configService.get('ASSISTANT_RATE_LIMIT_MAX_REQUESTS', {
      infer: true,
    });
  }

  /** Public SORA rate-limit window duration in seconds. */
  get assistantRateLimitWindowSeconds(): number {
    return this.configService.get('ASSISTANT_RATE_LIMIT_WINDOW_SECONDS', {
      infer: true,
    });
  }

  /** Version tag for assistant system prompts (cache invalidation). */
  get assistantPromptVersion(): string {
    return this.configService.get('ASSISTANT_PROMPT_VERSION', { infer: true });
  }

  /** TTL in days for persisted assistant response cache entries. */
  get assistantCacheTtlDays(): number {
    return this.configService.get('ASSISTANT_CACHE_TTL_DAYS', { infer: true });
  }

  /** Maximum LLM calls accepted per UTC day; 0 disables the guard. */
  get assistantDailyLlmLimit(): number {
    return this.configService.get('ASSISTANT_DAILY_LLM_LIMIT', {
      infer: true,
    });
  }

  /** Maximum LLM calls accepted per UTC month; 0 disables the guard. */
  get assistantMonthlyLlmLimit(): number {
    return this.configService.get('ASSISTANT_MONTHLY_LLM_LIMIT', {
      infer: true,
    });
  }

  /** Brandfetch Logo API client ID for fund manager logo URLs. */
  get brandfetchClientId(): string | undefined {
    return this.configService.get('BRANDFETCH_CLIENT_ID', { infer: true });
  }

  /** Whether OpenAPI/Swagger UI is registered at `/api/docs`. */
  get swaggerEnabled(): boolean {
    return this.configService.get('SWAGGER_ENABLED', { infer: true });
  }

  /** Global rate-limit window duration in seconds. */
  get throttleTtlSeconds(): number {
    return this.configService.get('THROTTLE_TTL_SECONDS', { infer: true });
  }

  /** Maximum requests per IP per window for public API routes. */
  get throttleLimit(): number {
    return this.configService.get('THROTTLE_LIMIT', { infer: true });
  }

  /** Maximum requests per IP per window for SORA assistant routes. */
  get throttleAssistantLimit(): number {
    return this.configService.get('THROTTLE_ASSISTANT_LIMIT', { infer: true });
  }

  /** Maximum analytics ingestion requests per IP/window. */
  get throttleAnalyticsLimit(): number {
    return this.configService.get('THROTTLE_ANALYTICS_LIMIT', { infer: true });
  }

  /** Maximum anonymous device registration requests per IP/window. */
  get throttleDeviceRegisterLimit(): number {
    return this.configService.get('THROTTLE_DEVICE_REGISTER_LIMIT', {
      infer: true,
    });
  }

  /** Optional Redis URL for distributed rate-limit storage. */
  get throttleRedisUrl(): string | undefined {
    return this.configService.get('THROTTLE_REDIS_URL', { infer: true });
  }
}

import { z } from 'zod';
import {
  applyAppEnvironmentDefaults,
  requiresLiveFmpDataSource,
} from './app-environment';

/**
 * Zod schema for environment variables.
 * Inferred type {@link Env} is the single source of truth for typed config access.
 */
export const envSchema = z
  .object({
    APP_ENV: z.enum(['local', 'qa', 'pro']).default('local'),
    PORT: z.coerce.number().int().positive().default(3000),
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    POSTGRES_USER: z.string().min(1),
    POSTGRES_PASSWORD: z.string().min(1),
    POSTGRES_DB: z.string().min(1),
    POSTGRES_HOST: z.string().min(1),
    POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
    DATABASE_URL: z
      .string()
      .regex(
        /^postgresql:\/\/.+/,
        'DATABASE_URL must be a PostgreSQL connection string',
      ),
    HTTP_CLIENT_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
    HTTP_CLIENT_MAX_RETRIES: z.coerce.number().int().min(0).default(3),
    HTTP_CLIENT_RETRY_DELAY_MS: z.coerce.number().int().positive().default(500),
    FMP_API_KEY: z.string().min(1),
    FMP_BASE_URL: z.string().url().default('https://financialmodelingprep.com'),
    FMP_DATA_SOURCE: z.enum(['mock', 'live']).default('mock'),
    FMP_SAVE_FIXTURES: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    MYINVESTOR_MCP_URL: z
      .string()
      .url()
      .default('https://mcp.myinvestor.es/mcp'),
    MYINVESTOR_DATA_SOURCE: z.enum(['mock', 'live']).default('mock'),
    SYNC_SCHEDULER_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    SYNC_CRON_EXPRESSION: z.string().min(1).default('0 6 * * *'),
    SYNC_FUND_SYMBOLS: z
      .string()
      .default('')
      .transform((value) => parseFundSymbolList(value)),
    SYNC_ETF_LIST_DISCOVERY: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    SYNC_DISCOVERY_LIMIT: z.coerce.number().int().positive().default(50),
    SYNC_DISCOVERY_OFFSET: z.coerce.number().int().nonnegative().default(0),
    SYNC_DISCOVERY_MODE: z.enum(['all', 'indexed']).default('all'),
    SYNC_COMPOSITION_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    FUND_PRICES_RETENTION_YEARS: z.coerce.number().int().min(5).default(7),
    ADMIN_SYNC_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    ADMIN_CATALOG_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    ADMIN_API_KEY: z.string().min(8).optional(),
    CORS_ORIGINS: z
      .string()
      .default('')
      .transform((value) => parseCommaSeparatedList(value)),
    OPENAI_API_KEY: z.string().min(1).optional(),
    OPENAI_MODEL: z.string().min(1).default('gpt-4o-mini'),
    ASSISTANT_LLM_PRIMARY_BASE_URL: z.string().url().optional(),
    ASSISTANT_LLM_PRIMARY_MODEL: z
      .string()
      .min(1)
      .default('qwen-2.5-7b-instruct'),
    ASSISTANT_LLM_PRIMARY_API_KEY: z.string().min(1).optional(),
    ASSISTANT_OPENAI_FALLBACK_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    ASSISTANT_FALLBACK_CONFIDENCE_THRESHOLD: z.coerce
      .number()
      .min(0)
      .max(1)
      .default(0.6),
    ASSISTANT_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    ASSISTANT_RUNTIME: z.enum(['nestjs', 'python-agent']).default('nestjs'),
    ASSISTANT_AGENT_BASE_URL: z.string().url().default('http://localhost:8001'),
    ASSISTANT_AGENT_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(10_000),
    ASSISTANT_AGENT_API_KEY: z.string().min(16).optional(),
    ASSISTANT_INTERNAL_API_KEY: z.string().min(8).optional(),
    ASSISTANT_RATE_LIMIT_MAX_REQUESTS: z.coerce
      .number()
      .int()
      .positive()
      .default(30),
    ASSISTANT_RATE_LIMIT_WINDOW_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(60),
    ASSISTANT_PROMPT_VERSION: z.string().min(1).default('sora-v2'),
    ASSISTANT_CACHE_TTL_DAYS: z.coerce.number().int().positive().default(90),
    BRANDFETCH_CLIENT_ID: z.string().min(1).optional(),
    SWAGGER_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
    THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),
    THROTTLE_ASSISTANT_LIMIT: z.coerce.number().int().positive().default(30),
    THROTTLE_REDIS_URL: z.string().url().optional(),
    SENTRY_DSN: z.string().url().optional(),
  })
  .superRefine((env, ctx) => {
    const adminApiEnabled = env.ADMIN_SYNC_ENABLED || env.ADMIN_CATALOG_ENABLED;

    if (adminApiEnabled && env.ADMIN_API_KEY === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['ADMIN_API_KEY'],
        message:
          'ADMIN_API_KEY is required when ADMIN_SYNC_ENABLED or ADMIN_CATALOG_ENABLED is true (minimum 8 characters)',
      });
    }

    if (
      env.ASSISTANT_ENABLED &&
      env.ASSISTANT_RUNTIME === 'python-agent' &&
      env.ASSISTANT_AGENT_API_KEY === undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['ASSISTANT_AGENT_API_KEY'],
        message:
          'ASSISTANT_AGENT_API_KEY is required when ASSISTANT_ENABLED is true and ASSISTANT_RUNTIME is python-agent (minimum 16 characters)',
      });
    }

    if (
      env.ASSISTANT_ENABLED &&
      env.ASSISTANT_RUNTIME === 'nestjs' &&
      env.ASSISTANT_LLM_PRIMARY_API_KEY === undefined &&
      env.OPENAI_API_KEY === undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['ASSISTANT_LLM_PRIMARY_API_KEY'],
        message:
          'ASSISTANT_LLM_PRIMARY_API_KEY is required when ASSISTANT_ENABLED is true and ASSISTANT_RUNTIME is nestjs (or provide OPENAI_API_KEY for legacy mode)',
      });
    }

    if (env.APP_ENV !== 'local') {
      const placeholderGuardedKeys = [
        'POSTGRES_PASSWORD',
        'DATABASE_URL',
        'FMP_API_KEY',
        'ADMIN_API_KEY',
        'OPENAI_API_KEY',
        'ASSISTANT_LLM_PRIMARY_API_KEY',
        'ASSISTANT_AGENT_API_KEY',
        'ASSISTANT_INTERNAL_API_KEY',
      ] as const;

      for (const key of placeholderGuardedKeys) {
        const value = env[key];

        if (typeof value === 'string' && value.includes('change-me')) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} must not use a committed "change-me" placeholder when APP_ENV is qa or pro`,
          });
        }
      }
    }

    if (requiresLiveFmpDataSource(env.APP_ENV)) {
      if (env.FMP_DATA_SOURCE !== 'live') {
        ctx.addIssue({
          code: 'custom',
          path: ['FMP_DATA_SOURCE'],
          message:
            'FMP_DATA_SOURCE must be "live" when APP_ENV is qa or pro (remove explicit mock override or switch APP_ENV to local)',
        });
      }

      if (env.FMP_SAVE_FIXTURES) {
        ctx.addIssue({
          code: 'custom',
          path: ['FMP_SAVE_FIXTURES'],
          message: 'FMP_SAVE_FIXTURES must be false when APP_ENV is qa or pro',
        });
      }
    }
  });

/**
 * Parses a comma-separated fund symbol list from environment configuration.
 *
 * @param value - Raw comma-separated symbol string.
 * @returns Normalized uppercase symbols.
 */
function parseFundSymbolList(value: string): readonly string[] {
  return value
    .split(',')
    .map((symbol) => symbol.trim().toUpperCase())
    .filter((symbol) => symbol.length > 0);
}

/**
 * Parses a comma-separated list from environment configuration.
 *
 * @param value - Raw comma-separated string.
 * @returns Normalized non-empty entries.
 */
function parseCommaSeparatedList(value: string): readonly string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/** Validated, typed environment configuration. */
export type Env = z.infer<typeof envSchema>;

/**
 * Validates raw environment variables and returns a typed configuration object.
 *
 * @param config - Raw environment variables (typically `process.env`).
 * @returns Parsed and typed environment configuration.
 * @throws {Error} When validation fails.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const prepared = applyAppEnvironmentDefaults(config);
  const parsed = envSchema.safeParse(prepared);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Environment validation failed:\n${message}`);
  }

  return parsed.data;
}

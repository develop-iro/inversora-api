import { z } from 'zod';

/**
 * Zod schema for environment variables.
 * Inferred type {@link Env} is the single source of truth for typed config access.
 */
export const envSchema = z.object({
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
  SYNC_SCHEDULER_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SYNC_CRON_EXPRESSION: z.string().min(1).default('0 6 * * *'),
  SYNC_FUND_SYMBOLS: z
    .string()
    .default('')
    .transform((value) => parseFundSymbolList(value)),
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
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Environment validation failed:\n${message}`);
  }

  return parsed.data;
}

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
});

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

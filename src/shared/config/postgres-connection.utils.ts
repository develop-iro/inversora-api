/**
 * Parsed PostgreSQL connection fields derived from a `DATABASE_URL`.
 */
export type ParsedPostgresConnection = {
  readonly user: string;
  readonly password: string;
  readonly host: string;
  readonly port: string;
  readonly database: string;
};

/**
 * Returns whether an environment variable is unset or blank.
 *
 * @param value - Raw environment variable value.
 */
export function isUnsetEnvironmentValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }

  return typeof value === 'string' && value.trim().length === 0;
}

/**
 * Parses a PostgreSQL connection string into discrete fields.
 *
 * Accepts `postgresql://` and `postgres://` URIs, including URL-encoded
 * credentials and optional query parameters (for example `sslmode=require`).
 *
 * @param databaseUrl - PostgreSQL connection URI.
 * @returns Parsed connection fields.
 * @throws {Error} When the URI is not a valid PostgreSQL connection string.
 */
export function parsePostgresConnectionString(
  databaseUrl: string,
): ParsedPostgresConnection {
  let parsed: URL;

  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL is not a valid URL');
  }

  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error(
      'DATABASE_URL must use the postgresql:// or postgres:// scheme',
    );
  }

  const database = decodeURIComponent(
    parsed.pathname.replace(/^\/+/, '').split('/')[0] ?? '',
  );
  const user = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);
  const host = parsed.hostname;
  const port = parsed.port.length > 0 ? parsed.port : '5432';

  if (
    user.length === 0 ||
    password.length === 0 ||
    host.length === 0 ||
    database.length === 0
  ) {
    throw new Error(
      'DATABASE_URL must include user, password, host, and database name',
    );
  }

  return {
    user,
    password,
    host,
    port,
    database,
  };
}

/**
 * Fills blank `POSTGRES_*` fields from `DATABASE_URL` before Zod validation.
 *
 * Explicit `POSTGRES_*` values always win. Prisma continues to use
 * `DATABASE_URL` for connections; these fields only satisfy the env schema.
 *
 * @param config - Raw environment variables.
 * @returns Config with missing Postgres fields hydrated when possible.
 */
export function applyPostgresDefaultsFromDatabaseUrl(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const databaseUrl =
    typeof config.DATABASE_URL === 'string' ? config.DATABASE_URL.trim() : '';

  if (databaseUrl.length === 0) {
    return config;
  }

  const needsHydration = (
    [
      'POSTGRES_USER',
      'POSTGRES_PASSWORD',
      'POSTGRES_DB',
      'POSTGRES_HOST',
      'POSTGRES_PORT',
    ] as const
  ).some((key) => isUnsetEnvironmentValue(config[key]));

  if (!needsHydration) {
    return config;
  }

  let parsed: ParsedPostgresConnection;

  try {
    parsed = parsePostgresConnectionString(databaseUrl);
  } catch {
    return config;
  }

  const merged: Record<string, unknown> = { ...config };

  if (isUnsetEnvironmentValue(merged.POSTGRES_USER)) {
    merged.POSTGRES_USER = parsed.user;
  }

  if (isUnsetEnvironmentValue(merged.POSTGRES_PASSWORD)) {
    merged.POSTGRES_PASSWORD = parsed.password;
  }

  if (isUnsetEnvironmentValue(merged.POSTGRES_DB)) {
    merged.POSTGRES_DB = parsed.database;
  }

  if (isUnsetEnvironmentValue(merged.POSTGRES_HOST)) {
    merged.POSTGRES_HOST = parsed.host;
  }

  if (isUnsetEnvironmentValue(merged.POSTGRES_PORT)) {
    merged.POSTGRES_PORT = parsed.port;
  }

  return merged;
}

/** Supported Inversora API deployment profiles. */
export const APP_ENVIRONMENTS = ['local', 'qa', 'pro'] as const;

/** Parsed API deployment profile. */
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

type ProfileDefaultValue = string;

type ProfileDefaults = Readonly<Partial<Record<string, ProfileDefaultValue>>>;

const PROFILE_DEFAULTS: Readonly<Record<AppEnvironment, ProfileDefaults>> = {
  local: {
    NODE_ENV: 'development',
    FMP_DATA_SOURCE: 'mock',
    FMP_SAVE_FIXTURES: 'false',
    SYNC_SCHEDULER_ENABLED: 'false',
  },
  qa: {
    NODE_ENV: 'production',
    FMP_DATA_SOURCE: 'live',
    FMP_SAVE_FIXTURES: 'false',
    SYNC_SCHEDULER_ENABLED: 'false',
  },
  pro: {
    NODE_ENV: 'production',
    FMP_DATA_SOURCE: 'live',
    FMP_SAVE_FIXTURES: 'false',
    SYNC_SCHEDULER_ENABLED: 'true',
    ADMIN_SYNC_ENABLED: 'false',
    ADMIN_CATALOG_ENABLED: 'false',
  },
};

/**
 * Parses `APP_ENV` into a supported deployment profile.
 *
 * @param raw - Raw environment variable value.
 */
export function parseAppEnvironment(raw: unknown): AppEnvironment {
  const normalized = typeof raw === 'string' ? raw.trim().toLowerCase() : '';

  if ((APP_ENVIRONMENTS as readonly string[]).includes(normalized)) {
    return normalized as AppEnvironment;
  }

  return 'local';
}

/**
 * Returns whether an environment variable is unset or blank.
 *
 * @param value - Raw environment variable value.
 */
function isUnsetEnvironmentValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }

  return typeof value === 'string' && value.trim().length === 0;
}

/**
 * Applies deployment-profile defaults before Zod validation.
 *
 * Explicit `.env` values always win over profile defaults.
 *
 * @param config - Raw environment variables.
 */
export function applyAppEnvironmentDefaults(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const appEnv = parseAppEnvironment(config.APP_ENV);
  const merged: Record<string, unknown> = {
    ...config,
    APP_ENV: appEnv,
  };

  for (const [key, value] of Object.entries(PROFILE_DEFAULTS[appEnv])) {
    if (isUnsetEnvironmentValue(merged[key])) {
      merged[key] = value;
    }
  }

  return merged;
}

/**
 * Returns whether the profile requires live FMP data in production-like modes.
 *
 * @param appEnv - Deployment profile.
 */
export function requiresLiveFmpDataSource(appEnv: AppEnvironment): boolean {
  return appEnv === 'qa' || appEnv === 'pro';
}

/**
 * Returns whether admin HTTP surfaces are disabled by default for the profile.
 *
 * @param appEnv - Deployment profile.
 */
export function disablesAdminByDefault(appEnv: AppEnvironment): boolean {
  return appEnv === 'pro';
}

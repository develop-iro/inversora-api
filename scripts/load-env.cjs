const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const projectRoot = resolve(__dirname, '..');
const CANONICAL_PROFILES = ['local', 'qa', 'pro'];
const PROFILE_ALIASES = {
  ei: 'local',
  dev: 'local',
  development: 'local',
  staging: 'qa',
  production: 'pro',
  prod: 'pro',
};

/** @type {Set<string> | null} */
let shellEnvKeys = null;

/**
 * Resets shell snapshot between tests.
 */
function resetLoadEnvForTests() {
  shellEnvKeys = null;
}

/**
 * @param {unknown} raw
 * @returns {'local' | 'qa' | 'pro'}
 */
function normalizeProfile(raw) {
  const normalized =
    typeof raw === 'string' ? raw.trim().toLowerCase() : '';

  if (normalized.length === 0) {
    return 'local';
  }

  const aliased = PROFILE_ALIASES[normalized] ?? normalized;

  if (CANONICAL_PROFILES.includes(aliased)) {
    return /** @type {'local' | 'qa' | 'pro'} */ (aliased);
  }

  return 'local';
}

/**
 * Resolves the active deployment profile from environment selectors.
 *
 * Priority: `INVERSORA_ENV` → `APP_ENV` → `ENV`.
 * Aliases such as `ei` map to `local`.
 *
 * @returns {'local' | 'qa' | 'pro'}
 */
function resolveProfile() {
  const selector =
    process.env.INVERSORA_ENV ??
    process.env.APP_ENV ??
    process.env.ENV ??
    'local';

  return normalizeProfile(selector);
}

/**
 * Parses KEY=VALUE pairs from an env file.
 *
 * @param {string} filePath
 * @returns {Record<string, string>}
 */
function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  /** @type {Record<string, string>} */
  const entries = {};
  const content = readFileSync(filePath, 'utf8');

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();

    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

/**
 * @param {string} key
 * @param {string} value
 * @param {'fill' | 'override'} mode
 */
function assignEnv(key, value, mode) {
  if (shellEnvKeys === null) {
    shellEnvKeys = new Set(Object.keys(process.env));
  }

  if (shellEnvKeys.has(key)) {
    return;
  }

  if (mode === 'fill' && process.env[key] !== undefined) {
    return;
  }

  process.env[key] = value;
}

/**
 * @param {string} filePath
 * @param {'fill' | 'override'} mode
 */
function applyEnvFile(filePath, mode) {
  for (const [key, value] of Object.entries(parseEnvFile(filePath))) {
    assignEnv(key, value, mode);
  }
}

/**
 * Loads `.env`, the committed profile file, and optional `.env.{profile}` overrides.
 *
 * @param {{ profile?: 'local' | 'qa' | 'pro', projectRoot?: string }} [options]
 * @returns {'local' | 'qa' | 'pro'}
 */
function loadEnv(options = {}) {
  if (shellEnvKeys === null) {
    shellEnvKeys = new Set(Object.keys(process.env));
  }

  const root = options.projectRoot ?? projectRoot;
  const profile = options.profile ?? resolveProfile();
  const envPath = resolve(root, '.env');
  const profilePath = resolve(root, 'env', `${profile}.env`);
  const profileOverridePath = resolve(root, `.env.${profile}`);

  if (!existsSync(envPath)) {
    throw new Error(
      `Missing ${envPath}. Copy .env.example and add your secrets (FMP_API_KEY, etc.).`,
    );
  }

  applyEnvFile(envPath, 'fill');
  applyEnvFile(profilePath, 'override');
  applyEnvFile(profileOverridePath, 'override');

  process.env.INVERSORA_ENV = profile;
  process.env.APP_ENV = profile;

  if (process.env.INVERSORA_ENV_DEBUG === 'true') {
    const databaseHost = process.env.DATABASE_URL?.includes('@')
      ? process.env.DATABASE_URL.split('@').pop()
      : '(unset)';

    console.log(
      `[load-env] profile=${profile} fmp=${process.env.FMP_DATA_SOURCE ?? '(unset)'} db=${databaseHost}`,
    );
  }

  return profile;
}

module.exports = {
  CANONICAL_PROFILES,
  PROFILE_ALIASES,
  loadEnv,
  normalizeProfile,
  parseEnvFile,
  resolveProfile,
  resetLoadEnvForTests,
};

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(projectRoot, '.env');

/**
 * Loads `.env` from the project root, overriding existing process variables.
 *
 * Node's `--env-file` does not override variables already set in the shell.
 * CLI scripts that talk to Neon must call this before creating PrismaClient.
 */
export function loadProjectEnv() {
  if (!existsSync(envPath)) {
    if (process.env.CI === 'true' && process.env.DATABASE_URL !== undefined) {
      return;
    }

    throw new Error(
      `Missing ${envPath}. Copy .env.example and configure DATABASE_URL.`,
    );
  }

  const content = readFileSync(envPath, 'utf8');

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

    process.env[key] = value;
  }
}

/**
 * Returns the database hostname from `DATABASE_URL` for diagnostics.
 */
export function getDatabaseHostLabel() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl === undefined || databaseUrl.length === 0) {
    return 'missing';
  }

  try {
    return new URL(databaseUrl).hostname;
  } catch {
    return 'invalid';
  }
}

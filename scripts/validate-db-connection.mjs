import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');
const envPath = resolve(rootDir, '.env');

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  return readFileSync(filePath, 'utf8')
    .split('\n')
    .reduce((env, line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        return env;
      }

      const separatorIndex = trimmed.indexOf('=');

      if (separatorIndex === -1) {
        return env;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();

      env[key] = value;
      return env;
    }, {});
}

const env = {
  POSTGRES_USER: 'inversora',
  POSTGRES_DB: 'inversora',
  ...loadEnvFile(envPath),
};

const user = env.POSTGRES_USER;
const database = env.POSTGRES_DB;

try {
  execSync(`docker compose exec -T postgres pg_isready -U ${user} -d ${database}`, {
    cwd: rootDir,
    stdio: 'inherit',
  });

  console.log(`PostgreSQL connection validated (${user}@${database}).`);
} catch {
  console.error(
    'Failed to validate PostgreSQL connection. Ensure Docker is running and execute: npm run db:up',
  );
  process.exit(1);
}

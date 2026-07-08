const { resolve } = require('node:path');
const { parseEnvFile } = require('./load-env.cjs');

/**
 * Verifies that the committed local security profile contains required keys.
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  const localEnvPath = resolve(__dirname, '..', 'env', 'local.env');
  const env = parseEnvFile(localEnvPath);

  assert(
    env.ADMIN_API_KEY?.length >= 8,
    'ADMIN_API_KEY must be configured for local admin routes',
  );
  assert(
    env.ASSISTANT_AGENT_API_KEY?.length >= 16,
    'ASSISTANT_AGENT_API_KEY must be at least 16 characters',
  );
  assert(
    env.ASSISTANT_INTERNAL_API_KEY?.length >= 8,
    'ASSISTANT_INTERNAL_API_KEY must be configured',
  );
  assert(
    env.POSTGRES_PASSWORD?.length > 0,
    'POSTGRES_PASSWORD must be configured for Docker Postgres',
  );
  assert(
    env.DATABASE_URL?.includes(env.POSTGRES_PASSWORD),
    'DATABASE_URL must match POSTGRES_PASSWORD in env/local.env',
  );

  console.log('[verify-local-security] env/local.env security profile OK');
}

main();

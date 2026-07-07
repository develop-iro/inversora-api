const { spawnSync } = require('node:child_process');
const { loadEnv, normalizeProfile } = require('./load-env.cjs');

/**
 * Runs a command after selecting an Inversora deployment profile.
 *
 * Usage:
 *   node scripts/run-with-profile.cjs local npm run sync:run -- --symbols SPY
 *   node scripts/run-with-profile.cjs qa npx prisma migrate deploy
 */
function main() {
  const profileArg = process.argv[2];

  if (profileArg === undefined || profileArg.trim().length === 0) {
    console.error(`Usage: node scripts/run-with-profile.cjs <local|qa|pro|ei> <command...>`);
    process.exit(1);
  }

  const profile = normalizeProfile(profileArg);
  process.env.INVERSORA_ENV = profile;
  loadEnv({ profile });

  const command = process.argv.slice(3);

  if (command.length === 0) {
    console.error('Missing command to run after profile selection.');
    process.exit(1);
  }

  const result = spawnSync(command[0], command.slice(1), {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  process.exit(result.status ?? 1);
}

main();

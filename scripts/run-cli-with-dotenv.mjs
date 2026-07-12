import { spawnSync } from 'node:child_process';
import { loadProjectEnv } from './load-project-env.mjs';

/**
 * Runs a TypeScript CLI entrypoint after forcing `.env` overrides.
 *
 * Node preload only fills missing env vars; shells often export a stale
 * local `DATABASE_URL`. Operational CLIs that must hit Neon use this runner.
 */
function main() {
  const entrypoint = process.argv[2];
  const cliArgs = process.argv.slice(3);

  if (entrypoint === undefined) {
    console.error(
      'Usage: node scripts/run-cli-with-dotenv.mjs <src/cli/file.ts> [-- args]',
    );
    process.exit(1);
  }

  loadProjectEnv();

  const result = spawnSync(
    process.execPath,
    [
      '-r',
      './scripts/preload-env.cjs',
      '-r',
      'ts-node/register',
      '-r',
      'tsconfig-paths/register',
      entrypoint,
      ...cliArgs,
    ],
    {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: process.env,
      shell: false,
    },
  );

  process.exit(result.status ?? 1);
}

main();

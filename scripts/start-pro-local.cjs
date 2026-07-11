const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { resolve } = require('node:path');

const { loadEnv, parseEnvFile } = require('./load-env.cjs');

const projectRoot = resolve(__dirname, '..');
const localOverlayPath = resolve(projectRoot, 'env/pro-local.env');

process.env.INVERSORA_ENV = 'pro';
loadEnv({ profile: 'pro', projectRoot });

if (existsSync(localOverlayPath)) {
  for (const [key, value] of Object.entries(parseEnvFile(localOverlayPath))) {
    process.env[key] = value;
  }
}

const result = spawnSync(
  'npx',
  ['nest', 'start', '--watch'],
  {
    stdio: 'inherit',
    shell: true,
    env: process.env,
    cwd: projectRoot,
  },
);

process.exit(result.status ?? 1);

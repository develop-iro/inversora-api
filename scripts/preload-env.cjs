const { existsSync, readFileSync } = require('node:fs');
const { dirname, resolve } = require('node:path');

const projectRoot = resolve(__dirname, '..');
const envPath = resolve(projectRoot, '.env');

if (!existsSync(envPath)) {
  throw new Error(`Missing ${envPath}. Copy .env.example and configure DATABASE_URL.`);
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

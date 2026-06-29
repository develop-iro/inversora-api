const { execSync } = require('node:child_process');
const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const projectRoot = resolve(__dirname, '..');
const schemaPath = resolve(projectRoot, 'prisma/schema.prisma');
const clientTypesPath = resolve(
  projectRoot,
  'node_modules/.prisma/client/index.d.ts',
);

/**
 * Returns whether the Prisma schema declares the fund issuer column.
 */
function schemaDeclaresFundIssuer() {
  if (!existsSync(schemaPath)) {
    return false;
  }

  return readFileSync(schemaPath, 'utf8').includes('issuer');
}

/**
 * Returns whether the generated Prisma client exposes `issuer` on Fund inputs.
 */
function generatedClientHasFundIssuer() {
  if (!existsSync(clientTypesPath)) {
    return false;
  }

  const clientTypes = readFileSync(clientTypesPath, 'utf8');

  return /export type FundUncheckedCreateInput[\s\S]*?issuer\?:/.test(
    clientTypes,
  );
}

/**
 * Regenerates the Prisma client when schema and generated types are out of sync.
 */
function ensurePrismaClient() {
  if (!schemaDeclaresFundIssuer()) {
    return;
  }

  if (generatedClientHasFundIssuer()) {
    return;
  }

  console.log(
    '[ensure-prisma-client] Regenerating Prisma client (Fund.issuer missing from generated types)...',
  );

  try {
    execSync('npx prisma generate', {
      cwd: projectRoot,
      stdio: 'inherit',
    });
  } catch {
    console.error('\n[ensure-prisma-client] prisma generate failed.');
    console.error(
      'Close Node processes using the API (sync:run, start:dev, tests) and retry.',
    );
    console.error(
      'On Windows with OneDrive, pause folder sync if EPERM persists.\n',
    );
    process.exit(1);
  }

  if (!generatedClientHasFundIssuer()) {
    console.error(
      '[ensure-prisma-client] Prisma client is still stale after generate.',
    );
    process.exit(1);
  }
}

ensurePrismaClient();

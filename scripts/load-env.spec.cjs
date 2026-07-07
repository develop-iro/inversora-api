const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

describe('normalizeProfile', () => {
  const { normalizeProfile } = require('./load-env.cjs');

  it('accepts canonical profiles', () => {
    assert.equal(normalizeProfile('local'), 'local');
    assert.equal(normalizeProfile('qa'), 'qa');
    assert.equal(normalizeProfile('pro'), 'pro');
  });

  it('maps ei and staging aliases', () => {
    assert.equal(normalizeProfile('ei'), 'local');
    assert.equal(normalizeProfile('staging'), 'qa');
    assert.equal(normalizeProfile('prod'), 'pro');
  });
});

describe('loadEnv', () => {
  let loadEnv;
  let resetLoadEnvForTests;
  /** @type {string | undefined} */
  let tempRoot;

  beforeEach(() => {
    ({ loadEnv, resetLoadEnvForTests } = require('./load-env.cjs'));
    resetLoadEnvForTests();
    delete process.env.DATABASE_URL;
    delete process.env.FMP_DATA_SOURCE;
    delete process.env.APP_ENV;
    delete process.env.INVERSORA_ENV;
    tempRoot = mkdtempSync(join(tmpdir(), 'inversora-load-env-'));
    mkdirSync(join(tempRoot, 'env'), { recursive: true });
    writeFileSync(
      join(tempRoot, '.env'),
      'FMP_API_KEY=secret-key\nDATABASE_URL=postgresql://from-dotenv\n',
    );
    writeFileSync(
      join(tempRoot, 'env', 'local.env'),
      'DATABASE_URL=postgresql://local-docker\nFMP_DATA_SOURCE=mock\nAPP_ENV=local\n',
    );
    writeFileSync(
      join(tempRoot, 'env', 'qa.env'),
      'DATABASE_URL=postgresql://qa-host\nFMP_DATA_SOURCE=live\nAPP_ENV=qa\n',
    );
  });

  afterEach(() => {
    resetLoadEnvForTests();
    if (tempRoot !== undefined) {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('maps ei to local profile defaults and overrides .env infrastructure keys', () => {
    process.env.INVERSORA_ENV = 'ei';
    delete process.env.DATABASE_URL;
    delete process.env.FMP_DATA_SOURCE;
    delete process.env.APP_ENV;

    const profile = loadEnv({ projectRoot: tempRoot, profile: 'local' });

    assert.equal(profile, 'local');
    assert.equal(process.env.DATABASE_URL, 'postgresql://local-docker');
    assert.equal(process.env.FMP_DATA_SOURCE, 'mock');
    assert.equal(process.env.FMP_API_KEY, 'secret-key');
    assert.equal(process.env.APP_ENV, 'local');
    assert.equal(process.env.INVERSORA_ENV, 'local');
  });

  it('applies optional .env.qa overrides after committed profile defaults', () => {
    writeFileSync(
      join(tempRoot, '.env.qa'),
      'DATABASE_URL=postgresql://personal-neon\n',
    );

    loadEnv({ projectRoot: tempRoot, profile: 'qa' });

    assert.equal(process.env.DATABASE_URL, 'postgresql://personal-neon');
    assert.equal(process.env.FMP_DATA_SOURCE, 'live');
  });
});

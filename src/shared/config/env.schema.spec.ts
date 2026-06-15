import { validateEnv } from './env.schema';

const validEnv = {
  PORT: '3000',
  NODE_ENV: 'development',
  POSTGRES_USER: 'inversora',
  POSTGRES_PASSWORD: 'inversora',
  POSTGRES_DB: 'inversora',
  POSTGRES_HOST: 'localhost',
  POSTGRES_PORT: '5432',
  DATABASE_URL: 'postgresql://inversora:inversora@localhost:5432/inversora',
  FMP_API_KEY: 'test-fmp-api-key',
};

describe('validateEnv', () => {
  it('should parse and return typed environment variables', () => {
    expect(validateEnv(validEnv)).toEqual({
      PORT: 3000,
      NODE_ENV: 'development',
      POSTGRES_USER: 'inversora',
      POSTGRES_PASSWORD: 'inversora',
      POSTGRES_DB: 'inversora',
      POSTGRES_HOST: 'localhost',
      POSTGRES_PORT: 5432,
      DATABASE_URL: 'postgresql://inversora:inversora@localhost:5432/inversora',
      HTTP_CLIENT_TIMEOUT_MS: 10_000,
      HTTP_CLIENT_MAX_RETRIES: 3,
      HTTP_CLIENT_RETRY_DELAY_MS: 500,
      FMP_API_KEY: 'test-fmp-api-key',
      FMP_BASE_URL: 'https://financialmodelingprep.com',
      FMP_DATA_SOURCE: 'mock',
      FMP_SAVE_FIXTURES: false,
      SYNC_SCHEDULER_ENABLED: false,
      SYNC_CRON_EXPRESSION: '0 6 * * *',
      SYNC_FUND_SYMBOLS: [],
      ADMIN_SYNC_ENABLED: false,
      ADMIN_CATALOG_ENABLED: false,
      ADMIN_API_KEY: undefined,
    });
  });

  it('should apply defaults for optional variables', () => {
    const required = {
      POSTGRES_USER: validEnv.POSTGRES_USER,
      POSTGRES_PASSWORD: validEnv.POSTGRES_PASSWORD,
      POSTGRES_DB: validEnv.POSTGRES_DB,
      POSTGRES_HOST: validEnv.POSTGRES_HOST,
      DATABASE_URL: validEnv.DATABASE_URL,
      FMP_API_KEY: validEnv.FMP_API_KEY,
    };

    expect(validateEnv(required)).toEqual({
      PORT: 3000,
      NODE_ENV: 'development',
      POSTGRES_USER: 'inversora',
      POSTGRES_PASSWORD: 'inversora',
      POSTGRES_DB: 'inversora',
      POSTGRES_HOST: 'localhost',
      POSTGRES_PORT: 5432,
      DATABASE_URL: 'postgresql://inversora:inversora@localhost:5432/inversora',
      HTTP_CLIENT_TIMEOUT_MS: 10_000,
      HTTP_CLIENT_MAX_RETRIES: 3,
      HTTP_CLIENT_RETRY_DELAY_MS: 500,
      FMP_API_KEY: 'test-fmp-api-key',
      FMP_BASE_URL: 'https://financialmodelingprep.com',
      FMP_DATA_SOURCE: 'mock',
      FMP_SAVE_FIXTURES: false,
      SYNC_SCHEDULER_ENABLED: false,
      SYNC_CRON_EXPRESSION: '0 6 * * *',
      SYNC_FUND_SYMBOLS: [],
      ADMIN_SYNC_ENABLED: false,
      ADMIN_CATALOG_ENABLED: false,
      ADMIN_API_KEY: undefined,
    });
  });

  it('should throw when required variables are missing', () => {
    expect(() => validateEnv({})).toThrow('Environment validation failed');
  });

  it('should throw when DATABASE_URL is not a PostgreSQL connection string', () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        DATABASE_URL: 'mysql://localhost:3306/inversora',
      }),
    ).toThrow('Environment validation failed');
  });

  it('should parse scheduled sync configuration', () => {
    expect(
      validateEnv({
        ...validEnv,
        SYNC_SCHEDULER_ENABLED: 'true',
        SYNC_CRON_EXPRESSION: '30 7 * * *',
        SYNC_FUND_SYMBOLS: 'spy, qqq',
      }),
    ).toMatchObject({
      SYNC_SCHEDULER_ENABLED: true,
      SYNC_CRON_EXPRESSION: '30 7 * * *',
      SYNC_FUND_SYMBOLS: ['SPY', 'QQQ'],
    });
  });

  it('should require ADMIN_API_KEY when any admin API feature is enabled', () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        ADMIN_SYNC_ENABLED: 'true',
      }),
    ).toThrow('Environment validation failed');

    expect(() =>
      validateEnv({
        ...validEnv,
        ADMIN_CATALOG_ENABLED: 'true',
      }),
    ).toThrow('Environment validation failed');
  });

  it('should parse admin sync configuration', () => {
    expect(
      validateEnv({
        ...validEnv,
        ADMIN_SYNC_ENABLED: 'true',
        ADMIN_API_KEY: 'local-dev-admin-key',
      }),
    ).toMatchObject({
      ADMIN_SYNC_ENABLED: true,
      ADMIN_CATALOG_ENABLED: false,
      ADMIN_API_KEY: 'local-dev-admin-key',
    });
  });

  it('should parse admin catalog configuration', () => {
    expect(
      validateEnv({
        ...validEnv,
        ADMIN_CATALOG_ENABLED: 'true',
        ADMIN_API_KEY: 'local-dev-admin-key',
      }),
    ).toMatchObject({
      ADMIN_CATALOG_ENABLED: true,
      ADMIN_API_KEY: 'local-dev-admin-key',
    });
  });
});

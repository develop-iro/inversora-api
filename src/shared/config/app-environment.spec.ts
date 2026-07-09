import {
  applyAppEnvironmentDefaults,
  parseAppEnvironment,
  requiresLiveFmpDataSource,
} from './app-environment';
import { validateEnv } from './env.schema';

const baseEnv = {
  POSTGRES_USER: 'inversora',
  POSTGRES_PASSWORD: 'inversora',
  POSTGRES_DB: 'inversora',
  POSTGRES_HOST: 'localhost',
  POSTGRES_PORT: '5432',
  DATABASE_URL: 'postgresql://inversora:inversora@localhost:5432/inversora',
  FMP_API_KEY: 'test-fmp-api-key',
};

describe('applyAppEnvironmentDefaults', () => {
  it('should default to local when APP_ENV is missing', () => {
    expect(parseAppEnvironment(undefined)).toBe('local');
    expect(applyAppEnvironmentDefaults({})).toMatchObject({
      APP_ENV: 'local',
      FMP_DATA_SOURCE: 'mock',
      NODE_ENV: 'development',
    });
  });

  it('should derive qa defaults without overriding explicit values', () => {
    expect(
      applyAppEnvironmentDefaults({
        APP_ENV: 'qa',
        FMP_DATA_SOURCE: 'mock',
        ADMIN_SYNC_ENABLED: 'false',
      }),
    ).toMatchObject({
      APP_ENV: 'qa',
      NODE_ENV: 'production',
      FMP_DATA_SOURCE: 'mock',
      ADMIN_SYNC_ENABLED: 'false',
    });
  });

  it('should derive production-oriented defaults for pro', () => {
    expect(applyAppEnvironmentDefaults({ APP_ENV: 'pro' })).toMatchObject({
      APP_ENV: 'pro',
      NODE_ENV: 'production',
      FMP_DATA_SOURCE: 'live',
      SYNC_SCHEDULER_ENABLED: 'true',
      ADMIN_SYNC_ENABLED: 'false',
      ADMIN_CATALOG_ENABLED: 'false',
      SWAGGER_ENABLED: 'false',
    });
  });
});

describe('validateEnv APP_ENV integration', () => {
  it('should accept qa profile with live FMP defaults', () => {
    expect(
      validateEnv({
        ...baseEnv,
        APP_ENV: 'qa',
      }),
    ).toMatchObject({
      APP_ENV: 'qa',
      NODE_ENV: 'production',
      FMP_DATA_SOURCE: 'live',
      FMP_SAVE_FIXTURES: false,
      ADMIN_SYNC_ENABLED: false,
    });
  });

  it('should reject qa profile when FMP mock is configured explicitly', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        APP_ENV: 'qa',
        FMP_DATA_SOURCE: 'mock',
      }),
    ).toThrow('Environment validation failed');
  });

  it('should reject pro profile when fixture saving is enabled', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        APP_ENV: 'pro',
        FMP_SAVE_FIXTURES: 'true',
      }),
    ).toThrow('Environment validation failed');
  });

  it('should keep explicit admin overrides on pro when configured', () => {
    expect(
      validateEnv({
        ...baseEnv,
        APP_ENV: 'pro',
        ADMIN_SYNC_ENABLED: 'true',
        ADMIN_API_KEY: 'production-admin-key',
      }),
    ).toMatchObject({
      APP_ENV: 'pro',
      ADMIN_SYNC_ENABLED: true,
      FMP_DATA_SOURCE: 'live',
    });
  });

  it('should disable Swagger by default on pro profile', () => {
    expect(
      validateEnv({
        ...baseEnv,
        APP_ENV: 'pro',
      }),
    ).toMatchObject({
      APP_ENV: 'pro',
      SWAGGER_ENABLED: false,
    });
  });
});

describe('requiresLiveFmpDataSource', () => {
  it('should require live FMP only for qa and pro', () => {
    expect(requiresLiveFmpDataSource('local')).toBe(false);
    expect(requiresLiveFmpDataSource('qa')).toBe(true);
    expect(requiresLiveFmpDataSource('pro')).toBe(true);
  });
});

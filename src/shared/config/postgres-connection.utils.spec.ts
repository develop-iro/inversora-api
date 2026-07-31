import {
  applyPostgresDefaultsFromDatabaseUrl,
  parsePostgresConnectionString,
} from './postgres-connection.utils';
import { validateEnv } from './env.schema';

describe('parsePostgresConnectionString', () => {
  it('parses a standard postgresql URI', () => {
    expect(
      parsePostgresConnectionString(
        'postgresql://neondb_owner:s3cret@ep-demo.us-east-1.aws.neon.tech/neondb?sslmode=require',
      ),
    ).toEqual({
      user: 'neondb_owner',
      password: 's3cret',
      host: 'ep-demo.us-east-1.aws.neon.tech',
      port: '5432',
      database: 'neondb',
    });
  });

  it('decodes URL-encoded credentials and explicit ports', () => {
    expect(
      parsePostgresConnectionString(
        'postgres://owner:p%40ss%2Fword@db.example.com:6543/app_db',
      ),
    ).toEqual({
      user: 'owner',
      password: 'p@ss/word',
      host: 'db.example.com',
      port: '6543',
      database: 'app_db',
    });
  });

  it('rejects non-postgres schemes', () => {
    expect(() =>
      parsePostgresConnectionString('mysql://user:pass@localhost:3306/db'),
    ).toThrow('postgresql:// or postgres://');
  });
});

describe('applyPostgresDefaultsFromDatabaseUrl', () => {
  it('hydrates blank POSTGRES_* fields from DATABASE_URL', () => {
    expect(
      applyPostgresDefaultsFromDatabaseUrl({
        DATABASE_URL:
          'postgresql://owner:secret@ep.example.neon.tech/neondb?sslmode=require',
        POSTGRES_USER: '',
        FMP_API_KEY: 'key',
      }),
    ).toMatchObject({
      POSTGRES_USER: 'owner',
      POSTGRES_PASSWORD: 'secret',
      POSTGRES_DB: 'neondb',
      POSTGRES_HOST: 'ep.example.neon.tech',
      POSTGRES_PORT: '5432',
    });
  });

  it('keeps explicit POSTGRES_* overrides', () => {
    expect(
      applyPostgresDefaultsFromDatabaseUrl({
        DATABASE_URL: 'postgresql://owner:secret@ep.example.neon.tech/neondb',
        POSTGRES_USER: 'custom-user',
        POSTGRES_HOST: 'custom-host',
      }),
    ).toMatchObject({
      POSTGRES_USER: 'custom-user',
      POSTGRES_PASSWORD: 'secret',
      POSTGRES_DB: 'neondb',
      POSTGRES_HOST: 'custom-host',
      POSTGRES_PORT: '5432',
    });
  });
});

describe('validateEnv postgres hydration', () => {
  it('accepts production-like env with only DATABASE_URL and FMP_API_KEY', () => {
    const env = validateEnv({
      APP_ENV: 'pro',
      DATABASE_URL:
        'postgresql://neondb_owner:real-secret@ep-demo.us-east-1.aws.neon.tech/neondb?sslmode=require',
      FMP_API_KEY: 'live-fmp-api-key',
    });

    expect(env.POSTGRES_USER).toBe('neondb_owner');
    expect(env.POSTGRES_PASSWORD).toBe('real-secret');
    expect(env.POSTGRES_DB).toBe('neondb');
    expect(env.POSTGRES_HOST).toBe('ep-demo.us-east-1.aws.neon.tech');
    expect(env.POSTGRES_PORT).toBe(5432);
    expect(env.FMP_DATA_SOURCE).toBe('live');
  });
});

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
    });
  });

  it('should apply defaults for optional variables', () => {
    const required = {
      POSTGRES_USER: validEnv.POSTGRES_USER,
      POSTGRES_PASSWORD: validEnv.POSTGRES_PASSWORD,
      POSTGRES_DB: validEnv.POSTGRES_DB,
      POSTGRES_HOST: validEnv.POSTGRES_HOST,
      DATABASE_URL: validEnv.DATABASE_URL,
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
});

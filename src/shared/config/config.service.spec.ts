import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from './config.service';
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

describe('AppConfigService', () => {
  let service: AppConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => validateEnv(validEnv)],
        }),
      ],
      providers: [AppConfigService],
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
  });

  it('should expose typed environment values', () => {
    expect(service.port).toBe(3000);
    expect(service.nodeEnv).toBe('development');
    expect(service.postgresUser).toBe('inversora');
    expect(service.postgresPassword).toBe('inversora');
    expect(service.postgresDb).toBe('inversora');
    expect(service.postgresHost).toBe('localhost');
    expect(service.postgresPort).toBe(5432);
    expect(service.databaseUrl).toBe(
      'postgresql://inversora:inversora@localhost:5432/inversora',
    );
    expect(service.isProduction).toBe(false);
  });
});

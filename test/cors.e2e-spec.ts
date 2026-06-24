import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { HealthController } from '../src/modules/health/health.controller';
import { buildNestCorsOptions } from '../src/shared/http/cors.config';

const allowedOrigin = 'http://localhost:8081';

describe('CORS (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableCors(buildNestCorsOptions([allowedOrigin]));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should answer OPTIONS preflight for an allowed Expo web origin', () => {
    return request(app.getHttpServer())
      .options('/health')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'accept,content-type')
      .expect(204)
      .expect('Access-Control-Allow-Origin', allowedOrigin)
      .expect('Access-Control-Allow-Methods', /GET/)
      .expect('Access-Control-Allow-Headers', /content-type/i);
  });

  it('should include CORS headers on GET for an allowed origin', () => {
    return request(app.getHttpServer())
      .get('/health')
      .set('Origin', allowedOrigin)
      .expect(200)
      .expect('Access-Control-Allow-Origin', allowedOrigin);
  });

  it('should omit allow-origin for a disallowed browser origin', () => {
    return request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'http://evil.example')
      .expect(200)
      .expect((response) => {
        expect(response.headers['access-control-allow-origin']).toBeUndefined();
      });
  });
});

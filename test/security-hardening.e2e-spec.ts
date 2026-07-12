import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { json, urlencoded } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AppConfigService } from '../src/shared/config/config.service';
import { buildBodyParserOptions } from '../src/shared/http/body-parser.config';
import { GlobalHttpExceptionFilter } from '../src/shared/http/http-exception.filter';

describe('Security hardening (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    const config = app.get(AppConfigService);
    const bodyParserOptions = buildBodyParserOptions(config.apiBodyLimit);
    app.use(json(bodyParserOptions.json));
    app.use(urlencoded(bodyParserOptions.urlencoded));
    app.useGlobalFilters(new GlobalHttpExceptionFilter(config));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('maps invalid analytics payloads to 400 instead of 500', async () => {
    await request(app.getHttpServer())
      .post('/analytics/events')
      .send({ event: 'screen_view' })
      .expect(400)
      .expect((response) => {
        expect(response.body).toMatchObject({
          statusCode: 400,
          message: 'Invalid request payload',
          path: '/analytics/events',
        });
      });
  });

  it('maps invalid anonymous device registration payloads to 400', async () => {
    await request(app.getHttpServer())
      .post('/anonymous-devices/register')
      .send({ platform: 'desktop' })
      .expect(400)
      .expect((response) => {
        expect(response.body).toMatchObject({
          statusCode: 400,
          message: 'Invalid request payload',
          path: '/anonymous-devices/register',
        });
      });
  });

  it('rejects oversized JSON bodies', async () => {
    await request(app.getHttpServer())
      .post('/analytics/events')
      .send({
        event: 'screen_view',
        surface: 'home',
        timestamp: '2026-07-12T10:00:00.000Z',
        sessionId: 'session-1',
        properties: {
          blob: 'x'.repeat(120_000),
        },
      })
      .expect(413);
  });
});

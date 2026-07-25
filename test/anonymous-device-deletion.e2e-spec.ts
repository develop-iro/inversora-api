import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { json, urlencoded } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { AppConfigService } from '../src/shared/config/config.service';
import { PrismaService } from '../src/shared/database/prisma.service';
import { buildBodyParserOptions } from '../src/shared/http/body-parser.config';
import { GlobalHttpExceptionFilter } from '../src/shared/http/http-exception.filter';
import { isDatabaseAvailable } from './integration/integration-test.utils';

describe('Anonymous device data deletion (e2e)', () => {
  let app: INestApplication<App> | undefined;
  let prisma: PrismaService | undefined;
  let skipSuite = false;

  beforeAll(async () => {
    skipSuite = !(await isDatabaseAvailable());

    if (skipSuite) {
      console.warn(
        'PostgreSQL is not available. Skipping anonymous device deletion e2e tests.',
      );
      return;
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    const config = app.get(AppConfigService);
    prisma = app.get(PrismaService);
    const bodyParserOptions = buildBodyParserOptions(config.apiBodyLimit);
    app.use(json(bodyParserOptions.json));
    app.use(urlencoded(bodyParserOptions.urlencoded));
    app.useGlobalFilters(new GlobalHttpExceptionFilter(config));
    await app.init();
  });

  afterAll(async () => {
    if (app !== undefined) {
      await app.close();
    }
  });

  it('rejects deletion without a device token', async () => {
    if (skipSuite || app === undefined) {
      return;
    }

    await request(app.getHttpServer())
      .delete('/anonymous-devices/me')
      .expect(401);
  });

  it('deletes the device and cascaded related rows', async () => {
    if (skipSuite || app === undefined || prisma === undefined) {
      return;
    }

    const registerResponse = await request(app.getHttpServer())
      .post('/anonymous-devices/register')
      .send({ platform: 'android', appVersion: '1.0.0-e2e' })
      .expect(201);

    const registerBody = registerResponse.body as {
      deviceToken: string;
      deviceId: string;
    };
    const deviceToken = registerBody.deviceToken;
    const deviceId = registerBody.deviceId;

    await request(app.getHttpServer())
      .put('/anonymous-devices/me/educational-profile')
      .set('X-Device-Token', deviceToken)
      .send({
        knowledgeLevel: 'beginner',
        riskOrientation: 'moderate',
        investmentHorizon: 'medium',
        investorStyle: 'balanced',
        financialReadiness: 'caution',
        learningGoal: 'learn-basics',
        profileVersion: 1,
        completedAt: '2026-07-25T10:00:00.000Z',
      })
      .expect(200);

    await prisma.analyticsEvent.create({
      data: {
        event: 'screen_view',
        surface: 'legal',
        sessionId: `sess_e2e_${deviceId}`,
        deviceId,
        occurredAt: new Date('2026-07-25T10:00:00.000Z'),
      },
    });

    await prisma.productFeedback.create({
      data: {
        clarity: 'yes',
        wouldReturn: 'yes',
        message: 'e2e deletion fixture',
        deviceId,
      },
    });

    const conversation = await prisma.assistantConversation.create({
      data: {
        sessionId: `sora_e2e_${deviceId}`,
        deviceId,
        surface: 'legal',
        messages: {
          create: {
            role: 'user',
            content: '¿Qué es un fondo indexado?',
          },
        },
      },
    });

    await request(app.getHttpServer())
      .delete('/anonymous-devices/me')
      .set('X-Device-Token', deviceToken)
      .expect(200)
      .expect({ deleted: true, deviceId });

    await expect(
      prisma.anonymousDevice.findUnique({ where: { id: deviceId } }),
    ).resolves.toBeNull();
    await expect(
      prisma.anonymousEducationalProfile.findUnique({ where: { deviceId } }),
    ).resolves.toBeNull();
    await expect(
      prisma.analyticsEvent.count({ where: { deviceId } }),
    ).resolves.toBe(0);
    await expect(
      prisma.productFeedback.count({ where: { deviceId } }),
    ).resolves.toBe(0);
    await expect(
      prisma.assistantConversation.findUnique({
        where: { id: conversation.id },
      }),
    ).resolves.toBeNull();
    await expect(
      prisma.assistantMessage.count({
        where: { conversationId: conversation.id },
      }),
    ).resolves.toBe(0);
  });
});

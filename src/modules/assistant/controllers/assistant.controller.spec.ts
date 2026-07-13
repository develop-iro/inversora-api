import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AssistantController } from './assistant.controller';
import { AssistantService } from '../services/assistant.service';
import { AnonymousDevicesService } from '../../anonymous-devices/services/anonymous-devices.service';

describe('AssistantController', () => {
  let controller: AssistantController;
  let assistantService: { explain: jest.Mock; chat: jest.Mock };
  let anonymousDevicesService: { resolveOptionalDeviceId: jest.Mock };

  beforeEach(async () => {
    assistantService = {
      explain: jest.fn(),
      chat: jest.fn(),
    };
    anonymousDevicesService = {
      resolveOptionalDeviceId: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssistantController],
      providers: [
        {
          provide: AssistantService,
          useValue: assistantService,
        },
        {
          provide: AnonymousDevicesService,
          useValue: anonymousDevicesService,
        },
      ],
    }).compile();

    controller = module.get(AssistantController);
  });

  it('returns assistant explain responses', async () => {
    assistantService.explain.mockResolvedValue({
      text: 'El TER mide la comision anual.',
      title: 'TER',
      source: 'glossary',
      cached: false,
      disclaimer: 'Disclaimer',
      promptVersion: 'sora-v1',
    });

    await expect(
      controller.explain({
        surface: 'home',
        message: '¿Qué es el TER?',
      }),
    ).resolves.toMatchObject({
      source: 'glossary',
      title: 'TER',
    });
  });

  it('throws on invalid request bodies', async () => {
    await expect(
      controller.explain({
        surface: 'home',
        message: '',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns assistant chat responses', async () => {
    assistantService.chat.mockResolvedValue({
      text: 'Ambos fondos siguen indices distintos.',
      title: 'Como comparar fondos en Inversora',
      source: 'openai',
      cached: false,
      disclaimer: 'Disclaimer',
      promptVersion: 'sora-v1',
      sessionId: 'session-1',
    });

    await expect(
      controller.chat({
        surface: 'compare',
        message: 'Compara estos dos fondos',
        sessionId: 'session-1',
        funds: [{ isin: 'US78462F1030' }, { isin: 'US46090E1038' }],
      }),
    ).resolves.toMatchObject({
      source: 'openai',
      sessionId: 'session-1',
    });
    expect(assistantService.chat).toHaveBeenCalledWith(
      expect.any(Object),
      undefined,
    );
  });

  it('passes a resolved device id into chat responses', async () => {
    const token = `dev_${'a'.repeat(64)}`;
    anonymousDevicesService.resolveOptionalDeviceId.mockResolvedValue(
      'device-1',
    );
    assistantService.chat.mockResolvedValue({
      text: 'Respuesta educativa.',
      source: 'glossary',
      cached: false,
      disclaimer: 'Disclaimer',
      promptVersion: 'sora-v1',
      sessionId: 'session-1',
    });

    await controller.chat(
      {
        surface: 'home',
        message: 'Que es el TER?',
        sessionId: 'session-1',
      },
      token,
    );

    expect(assistantService.chat).toHaveBeenCalledWith(
      expect.any(Object),
      'device-1',
    );
  });

  it('rejects invalid optional device tokens', async () => {
    anonymousDevicesService.resolveOptionalDeviceId.mockRejectedValue(
      new UnauthorizedException(),
    );

    await expect(
      controller.chat(
        {
          surface: 'home',
          message: 'Que es el TER?',
          sessionId: 'session-1',
        },
        'invalid',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

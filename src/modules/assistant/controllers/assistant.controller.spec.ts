import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AssistantController } from './assistant.controller';
import { AssistantService } from '../services/assistant.service';

describe('AssistantController', () => {
  let controller: AssistantController;
  let assistantService: { explain: jest.Mock; chat: jest.Mock };

  beforeEach(async () => {
    assistantService = {
      explain: jest.fn(),
      chat: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssistantController],
      providers: [
        {
          provide: AssistantService,
          useValue: assistantService,
        },
      ],
    }).compile();

    controller = module.get(AssistantController);
  });

  it('returns assistant explain responses', async () => {
    assistantService.explain.mockResolvedValue({
      text: 'El TER mide la comisión anual.',
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
      title: 'Cómo comparar fondos en Inversora',
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
  });
});

import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AssistantController } from './assistant.controller';
import { AssistantService } from '../services/assistant.service';

describe('AssistantController', () => {
  let controller: AssistantController;
  let assistantService: { explain: jest.Mock };

  beforeEach(async () => {
    assistantService = {
      explain: jest.fn(),
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
});

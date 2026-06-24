import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AppConfigService } from '../../../shared/config/config.service';
import { AssistantCacheRepository } from '../repositories/assistant-cache.repository';
import { AssistantContextBuilderService } from './assistant-context.builder';
import { AssistantOutputGuardrailsService } from './assistant-output.guardrails';
import { AssistantService } from './assistant.service';
import { GlossaryService } from './glossary.service';
import { IntentClassifierService } from './intent-classifier.service';
import { OpenAiAssistantService } from './openai-assistant.service';

describe('AssistantService', () => {
  let service: AssistantService;
  let config: {
    assistantEnabled: boolean;
    assistantPromptVersion: string;
    assistantCacheTtlDays: number;
  };
  let cacheRepository: { findValid: jest.Mock; save: jest.Mock };
  let openAiAssistant: { generate: jest.Mock };

  beforeEach(async () => {
    config = {
      assistantEnabled: false,
      assistantPromptVersion: 'sora-v1',
      assistantCacheTtlDays: 90,
    };
    cacheRepository = {
      findValid: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    };
    openAiAssistant = {
      generate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssistantService,
        IntentClassifierService,
        GlossaryService,
        AssistantOutputGuardrailsService,
        {
          provide: AppConfigService,
          useValue: config,
        },
        {
          provide: AssistantCacheRepository,
          useValue: cacheRepository,
        },
        {
          provide: AssistantContextBuilderService,
          useValue: { build: jest.fn() },
        },
        {
          provide: OpenAiAssistantService,
          useValue: openAiAssistant,
        },
      ],
    }).compile();

    service = module.get(AssistantService);
  });

  it('returns glossary responses without OpenAI', async () => {
    const response = await service.explain({
      surface: 'home',
      message: '¿Qué es el TER?',
    });

    expect(response.source).toBe('glossary');
    expect(response.title).toBe('TER');
    expect(openAiAssistant.generate).not.toHaveBeenCalled();
  });

  it('rejects forbidden user intents', async () => {
    await expect(
      service.explain({
        surface: 'home',
        message: '¿Debería comprar este fondo?',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when assistant is disabled and glossary misses', async () => {
    await expect(
      service.explain({
        surface: 'home',
        message: 'Explícame MSCI World en detalle educativo',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('returns cached responses when available', async () => {
    cacheRepository.findValid.mockResolvedValue({
      text: 'Respuesta cacheada.',
      title: 'Cache',
      source: 'openai',
      cached: false,
      disclaimer: 'Disclaimer',
      promptVersion: 'sora-v1',
    });

    const response = await service.explain({
      surface: 'home',
      message: 'Explícame MSCI World en detalle educativo',
    });

    expect(response.source).toBe('cache');
    expect(response.cached).toBe(true);
  });
});

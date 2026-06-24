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
  let contextBuilder: { build: jest.Mock };

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
    contextBuilder = {
      build: jest.fn().mockResolvedValue({
        surface: 'home',
        intent: 'general',
        locale: 'es',
        userMessage: 'Explícame MSCI World en detalle educativo',
      }),
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
          useValue: contextBuilder,
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

  it('generates OpenAI responses when enabled and glossary misses', async () => {
    config.assistantEnabled = true;
    openAiAssistant.generate.mockResolvedValue(
      'MSCI World es un índice global de acciones de mercados desarrollados.',
    );

    const response = await service.explain({
      surface: 'home',
      message: 'Explícame MSCI World en detalle educativo',
    });

    expect(response.source).toBe('openai');
    expect(response.title).toBe('Respuesta de SORA');
    expect(cacheRepository.save).toHaveBeenCalled();
  });

  it('builds compare and score titles for OpenAI responses', async () => {
    config.assistantEnabled = true;
    openAiAssistant.generate.mockResolvedValue('Texto educativo.');

    const compareResponse = await service.explain({
      surface: 'compare',
      message: 'SPY versus QQQ para aprender diferencias',
    });
    const scoreResponse = await service.explain({
      surface: 'fund_detail',
      message: 'Por que este fondo aparece asi',
      fund: { isin: 'US78462F1030' },
    });

    expect(compareResponse.title).toBe('Cómo comparar fondos en Inversora');
    expect(scoreResponse.title).toBe('Explicación del Score Inversora');
  });

  it('capitalizes question titles for OpenAI responses', async () => {
    config.assistantEnabled = true;
    openAiAssistant.generate.mockResolvedValue('Texto educativo.');

    const response = await service.explain({
      surface: 'home',
      message: 'como funciona esto?',
    });

    expect(response.title).toBe('Como funciona esto?');
  });

  it('persists locale and related fund ISIN in OpenAI responses', async () => {
    config.assistantEnabled = true;
    openAiAssistant.generate.mockResolvedValue('Texto educativo.');

    const response = await service.explain({
      surface: 'fund_detail',
      message: 'SPY versus QQQ para aprender diferencias',
      locale: 'en',
      fund: { isin: 'US78462F1030' },
    });

    expect(response.relatedFundIsin).toBe('US78462F1030');
    expect(cacheRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'en', fundIsin: 'US78462F1030' }),
    );
  });
});

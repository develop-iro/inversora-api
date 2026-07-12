import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AppConfigService } from '../../../shared/config/config.service';
import type { AssistantPromptContext } from './assistant-context.builder';
import { AssistantConfidenceService } from './assistant-confidence.service';
import { AssistantOutputGuardrailsService } from './assistant-output.guardrails';
import { AssistantLlmUsageService } from './assistant-llm-usage.service';
import type { LlmChatCompletionInput } from './llm-chat-completion.service';
import { AssistantLlmOrchestratorService } from './assistant-llm-orchestrator.service';
import { LlmChatCompletionService } from './llm-chat-completion.service';

describe('AssistantLlmOrchestratorService', () => {
  let service: AssistantLlmOrchestratorService;
  let llmCompletion: { complete: jest.Mock };
  let usage: { reserveCall: jest.Mock };
  let config: {
    assistantLlmPrimaryApiKey: string;
    assistantLlmPrimaryBaseUrl?: string;
    assistantLlmPrimaryModel: string;
    assistantOpenAiFallbackEnabled: boolean;
    assistantFallbackConfidenceThreshold: number;
    openAiApiKey?: string;
    openAiModel: string;
  };

  const context: AssistantPromptContext = {
    surface: 'home',
    intent: 'general',
    locale: 'es',
    userMessage: 'Pregunta general',
  };

  beforeEach(async () => {
    llmCompletion = {
      complete: jest.fn(),
    };
    usage = {
      reserveCall: jest.fn().mockResolvedValue(undefined),
    };
    config = {
      assistantLlmPrimaryApiKey: 'primary-key',
      assistantLlmPrimaryModel: 'qwen-2.5-7b-instruct',
      assistantOpenAiFallbackEnabled: true,
      assistantFallbackConfidenceThreshold: 0.9,
      openAiApiKey: 'openai-key',
      openAiModel: 'gpt-4o-mini',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssistantLlmOrchestratorService,
        AssistantConfidenceService,
        AssistantOutputGuardrailsService,
        {
          provide: LlmChatCompletionService,
          useValue: llmCompletion,
        },
        {
          provide: AppConfigService,
          useValue: config,
        },
        {
          provide: AssistantLlmUsageService,
          useValue: usage,
        },
      ],
    }).compile();

    service = module.get(AssistantLlmOrchestratorService);
  });

  it('returns qwen response when confidence is sufficient', async () => {
    llmCompletion.complete.mockResolvedValueOnce(
      'Respuesta educativa suficientemente larga para superar el umbral de confianza.',
    );

    const result = await service.generate(context, 'Pregunta general', []);

    expect(result.source).toBe('qwen');
    expect(result.model).toBe('qwen-2.5-7b-instruct');
    expect(llmCompletion.complete).toHaveBeenCalledTimes(1);
    expect(usage.reserveCall).toHaveBeenCalledTimes(1);
  });

  it('falls back to OpenAI when primary response is too short', async () => {
    llmCompletion.complete
      .mockResolvedValueOnce('Corto')
      .mockResolvedValueOnce(
        'Respuesta de fallback educativa con suficiente detalle para el usuario.',
      );

    const result = await service.generate(context, 'Pregunta general', []);

    expect(result.source).toBe('openai-fallback');
    expect(result.fallbackReason).toBe('low_confidence');
    expect(llmCompletion.complete).toHaveBeenCalledTimes(2);
    expect(usage.reserveCall).toHaveBeenCalledTimes(2);
  });

  it('marks fallback reason as guardrails when primary output is blocked', async () => {
    llmCompletion.complete
      .mockResolvedValueOnce('Te recomiendo comprar este fondo ya.')
      .mockResolvedValueOnce(
        'Respuesta educativa alternativa sin instrucciones operativas.',
      );

    const result = await service.generate(context, 'Pregunta general', []);

    expect(result.source).toBe('openai-fallback');
    expect(result.fallbackReason).toBe('guardrails');
    expect(llmCompletion.complete).toHaveBeenCalledTimes(2);
  });

  it('uses error fallback when the primary provider fails', async () => {
    llmCompletion.complete
      .mockRejectedValueOnce(new Error('primary down'))
      .mockResolvedValueOnce(
        'Respuesta educativa alternativa tras un fallo del proveedor primario.',
      );

    const result = await service.generate(context, 'Pregunta general', []);

    expect(result.source).toBe('openai-fallback');
    expect(result.fallbackReason).toBe('error');
    expect(llmCompletion.complete).toHaveBeenCalledTimes(2);
  });

  it('returns primary text when fallback is disabled but primary output exists', async () => {
    config.assistantOpenAiFallbackEnabled = false;
    config.openAiApiKey = undefined;
    llmCompletion.complete.mockResolvedValueOnce('Corto');

    const result = await service.generate(context, 'Pregunta general', []);

    expect(result.source).toBe('qwen');
    expect(result.fallbackReason).toBe('low_confidence');
    expect(llmCompletion.complete).toHaveBeenCalledTimes(1);
  });

  it('throws when fallback is unavailable and primary output is missing', async () => {
    config.assistantOpenAiFallbackEnabled = false;
    config.openAiApiKey = undefined;
    llmCompletion.complete.mockRejectedValueOnce(new Error('primary down'));

    await expect(
      service.generate(context, 'Pregunta general', []),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('includes retrieved RAG chunks in the user prompt', async () => {
    llmCompletion.complete.mockResolvedValueOnce(
      'Respuesta educativa suficientemente larga para superar el umbral de confianza.',
    );

    await service.generate(context, 'Pregunta general', [
      {
        id: 'ter-1',
        topic: 'comisiones',
        sourceFile: 'ter.md',
        locale: 'es',
        keywords: ['ter', 'comisiones'],
        content: 'El TER resume las comisiones anuales del fondo.',
      },
    ]);

    const calls = llmCompletion.complete.mock.calls as ReadonlyArray<
      [LlmChatCompletionInput]
    >;

    expect(calls[0]?.[0].userPrompt).toContain(
      'Fragmentos documentales educativos',
    );
  });

  it('returns primary text when fallback generation fails but primary output exists', async () => {
    llmCompletion.complete
      .mockResolvedValueOnce('Corto')
      .mockRejectedValueOnce(new Error('fallback down'));

    const result = await service.generate(context, 'Pregunta general', []);

    expect(result.source).toBe('qwen');
    expect(result.text).toBe('Corto');
    expect(result.fallbackReason).toBe('low_confidence');
  });
});

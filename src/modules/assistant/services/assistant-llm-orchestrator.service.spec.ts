import { Test, TestingModule } from '@nestjs/testing';

import { AppConfigService } from '../../../shared/config/config.service';
import type { AssistantPromptContext } from './assistant-context.builder';
import { AssistantConfidenceService } from './assistant-confidence.service';
import { AssistantOutputGuardrailsService } from './assistant-output.guardrails';
import { AssistantLlmOrchestratorService } from './assistant-llm-orchestrator.service';
import { LlmChatCompletionService } from './llm-chat-completion.service';

describe('AssistantLlmOrchestratorService', () => {
  let service: AssistantLlmOrchestratorService;
  let llmCompletion: { complete: jest.Mock };
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
});

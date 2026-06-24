import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { AppConfigService } from '../../../shared/config/config.service';
import { SCORING_ALGORITHM_VERSION } from '../../scoring/entities/score-weights';
import type {
  AssistantExplainRequest,
  AssistantExplainResponse,
} from '../entities/assistant-context.schema';
import {
  buildAssistantCacheKey,
  computeAssistantCacheExpiry,
  normalizeAssistantQuery,
} from '../entities/assistant-cache.utils';
import { ASSISTANT_EDUCATIONAL_DISCLAIMER } from '../entities/assistant-system-prompt';
import { AssistantCacheRepository } from '../repositories/assistant-cache.repository';
import { AssistantContextBuilderService } from './assistant-context.builder';
import { AssistantOutputGuardrailsService } from './assistant-output.guardrails';
import { GlossaryService } from './glossary.service';
import { IntentClassifierService } from './intent-classifier.service';
import { OpenAiAssistantService } from './openai-assistant.service';

/**
 * Orchestrates SORA assistant explain requests across glossary, cache, and OpenAI.
 */
@Injectable()
export class AssistantService {
  constructor(
    private readonly config: AppConfigService,
    private readonly intentClassifier: IntentClassifierService,
    private readonly glossaryService: GlossaryService,
    private readonly cacheRepository: AssistantCacheRepository,
    private readonly contextBuilder: AssistantContextBuilderService,
    private readonly openAiAssistant: OpenAiAssistantService,
    private readonly guardrails: AssistantOutputGuardrailsService,
  ) {}

  /**
   * Resolves an educational assistant response for a user message.
   *
   * @param request - Validated assistant explain request.
   */
  async explain(
    request: AssistantExplainRequest,
  ): Promise<AssistantExplainResponse> {
    if (this.intentClassifier.isForbiddenInput(request.message)) {
      throw new BadRequestException(
        'SORA no puede ayudarte con recomendaciones de compra o venta ni modificar rankings.',
      );
    }

    const locale = request.locale ?? 'es';
    const normalizedQuery = normalizeAssistantQuery(request.message);
    const fundIsin = request.fund?.isin;
    const promptVersion = this.config.assistantPromptVersion;

    const glossaryMatch = this.glossaryService.match(request.message);

    if (glossaryMatch !== null) {
      return this.guardrails.assertResponse({
        title: glossaryMatch.entry.term,
        text: glossaryMatch.entry.explanation,
        source: 'glossary',
        cached: false,
        disclaimer: ASSISTANT_EDUCATIONAL_DISCLAIMER,
        promptVersion,
      });
    }

    const intent = this.intentClassifier.classify(
      request.message,
      fundIsin !== undefined,
    );
    const cacheKey = buildAssistantCacheKey({
      intent,
      normalizedQuery,
      fundIsin,
      scoreVersion: SCORING_ALGORITHM_VERSION,
      promptVersion,
      locale,
    });

    const cached = await this.cacheRepository.findValid(cacheKey);

    if (cached !== null) {
      return this.guardrails.assertResponse({
        ...cached,
        source: 'cache',
        cached: true,
      });
    }

    if (!this.config.assistantEnabled) {
      throw new ServiceUnavailableException(
        'El asistente SORA no está disponible en este entorno.',
      );
    }

    const context = await this.contextBuilder.build(request, intent);
    const generatedText = await this.openAiAssistant.generate(
      context,
      request.message,
    );
    const sanitizedText = this.guardrails.sanitize(generatedText);

    const response: AssistantExplainResponse = {
      title: this.buildTitle(request.message, intent),
      text: sanitizedText,
      source: 'openai',
      cached: false,
      disclaimer: ASSISTANT_EDUCATIONAL_DISCLAIMER,
      relatedFundIsin: fundIsin,
      promptVersion,
    };

    await this.cacheRepository.save({
      cacheKey,
      intent,
      normalizedQuery,
      fundIsin,
      scoreVersion: SCORING_ALGORITHM_VERSION,
      promptVersion,
      locale,
      response,
      expiresAt: computeAssistantCacheExpiry(this.config.assistantCacheTtlDays),
    });

    return response;
  }

  private buildTitle(message: string, intent: string): string {
    if (intent === 'compare') {
      return 'Cómo comparar fondos en Inversora';
    }

    if (intent === 'explain_score') {
      return 'Explicación del Score Inversora';
    }

    const trimmed = message.trim();

    if (trimmed.endsWith('?')) {
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    }

    return 'Respuesta de SORA';
  }
}

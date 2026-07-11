import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { AppConfigService } from '../../../shared/config/config.service';
import { SCORING_ALGORITHM_VERSION } from '../../scoring/entities/score-weights';
import type {
  AssistantChatRequest,
  AssistantChatResponse,
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
import { AssistantConversationRepository } from '../repositories/assistant-conversation.repository';
import { AssistantContextBuilderService } from './assistant-context.builder';
import { AssistantOutputGuardrailsService } from './assistant-output.guardrails';
import { GlossaryService } from './glossary.service';
import { IntentClassifierService } from './intent-classifier.service';
import { OpenAiAssistantService } from './openai-assistant.service';
import { PythonAgentAssistantService } from './python-agent-assistant.service';

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
    private readonly pythonAgentAssistant: PythonAgentAssistantService,
    private readonly conversationRepository: AssistantConversationRepository,
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
    const generatedText = await this.generateWithConfiguredRuntime(
      context,
      request.message,
    );
    const sanitizedText = this.guardrails.sanitizeOrFallback(generatedText);

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

  /**
   * Resolves a conversational assistant response.
   *
   * Chat requests are not cached in the MVP because they may include session
   * state and multiple selected funds.
   *
   * @param request - Validated assistant chat request.
   */
  async chat(request: AssistantChatRequest): Promise<AssistantChatResponse> {
    if (this.intentClassifier.isForbiddenInput(request.message)) {
      throw new BadRequestException(
        'SORA no puede ayudarte con recomendaciones de compra o venta ni modificar rankings.',
      );
    }

    const promptVersion = this.config.assistantPromptVersion;
    const sessionId = request.sessionId ?? this.createSessionId();
    const locale = request.locale ?? 'es';
    const requestedFundIsins = this.getRequestedFundIsins(request);
    const recentMessages =
      request.sessionId === undefined
        ? []
        : await this.conversationRepository.findRecentMessages(
            request.sessionId,
            8,
          );
    const glossaryMatch = this.glossaryService.match(request.message);

    if (glossaryMatch !== null) {
      const response = this.guardrails.assertResponse({
        title: glossaryMatch.entry.term,
        text: glossaryMatch.entry.explanation,
        source: 'glossary',
        cached: false,
        disclaimer: ASSISTANT_EDUCATIONAL_DISCLAIMER,
        promptVersion,
        sessionId,
      });

      await this.conversationRepository.saveTurn({
        sessionId,
        surface: request.surface,
        locale,
        userMessage: request.message,
        intent: 'glossary',
        response,
        runtime: this.config.assistantRuntime,
        relatedFundIsins: requestedFundIsins,
      });

      return response;
    }

    if (!this.config.assistantEnabled) {
      throw new ServiceUnavailableException(
        'El asistente SORA no estÃ¡ disponible en este entorno.',
      );
    }

    const intent = this.intentClassifier.classify(
      request.message,
      requestedFundIsins.length > 0,
    );
    const context = await this.contextBuilder.build(
      request,
      intent,
      recentMessages,
    );
    const generatedText = await this.generateWithConfiguredRuntime(
      context,
      request.message,
    );
    const sanitizedText = this.guardrails.sanitizeOrFallback(generatedText);

    const response = this.guardrails.assertResponse({
      title: this.buildTitle(request.message, intent),
      text: sanitizedText,
      source: 'openai',
      cached: false,
      disclaimer: ASSISTANT_EDUCATIONAL_DISCLAIMER,
      relatedFundIsin:
        requestedFundIsins.length === 1 ? requestedFundIsins[0] : undefined,
      promptVersion,
      sessionId,
    });

    await this.conversationRepository.saveTurn({
      sessionId,
      surface: request.surface,
      locale,
      userMessage: request.message,
      intent,
      response,
      runtime: this.config.assistantRuntime,
      relatedFundIsins: requestedFundIsins,
    });

    return response;
  }

  private async generateWithConfiguredRuntime(
    context: Awaited<ReturnType<AssistantContextBuilderService['build']>>,
    message: string,
  ): Promise<string> {
    if (this.config.assistantRuntime === 'python-agent') {
      return this.pythonAgentAssistant.generate(context, message);
    }

    return this.openAiAssistant.generate(context, message);
  }

  private getRequestedFundIsins(
    request: AssistantChatRequest,
  ): readonly string[] {
    return [
      ...new Set(
        [
          request.fund?.isin,
          ...(request.funds?.map((fund) => fund.isin) ?? []),
        ].filter((isin): isin is string => isin !== undefined),
      ),
    ];
  }

  private createSessionId(): string {
    return `sora_${randomUUID()}`;
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

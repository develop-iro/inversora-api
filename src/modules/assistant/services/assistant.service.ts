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

import { AssistantLlmOrchestratorService } from './assistant-llm-orchestrator.service';

import { AssistantOutputGuardrailsService } from './assistant-output.guardrails';

import { AssistantRagService } from './assistant-rag.service';

import { DeterministicAssistantService } from './deterministic-assistant.service';

import { GlossaryService } from './glossary.service';

import { IntentClassifierService } from './intent-classifier.service';

import { PythonAgentAssistantService } from './python-agent-assistant.service';

/**

 * Orchestrates SORA assistant requests across rules, glossary, cache, templates, RAG and LLMs.

 */

@Injectable()
export class AssistantService {
  constructor(
    private readonly config: AppConfigService,

    private readonly intentClassifier: IntentClassifierService,

    private readonly glossaryService: GlossaryService,

    private readonly cacheRepository: AssistantCacheRepository,

    private readonly contextBuilder: AssistantContextBuilderService,

    private readonly deterministicAssistant: DeterministicAssistantService,

    private readonly ragService: AssistantRagService,

    private readonly llmOrchestrator: AssistantLlmOrchestratorService,

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

    const context = await this.contextBuilder.build(request, intent);

    if (this.intentClassifier.supportsDeterministicTemplate(intent)) {
      const template = this.deterministicAssistant.tryBuild(context, intent);

      if (template !== null) {
        const response = this.guardrails.assertResponse({
          title: template.title,

          text: template.text,

          source: 'template',

          cached: false,

          disclaimer: ASSISTANT_EDUCATIONAL_DISCLAIMER,

          relatedFundIsin: fundIsin,

          promptVersion,
        });

        await this.cacheRepository.save({
          cacheKey,

          intent,

          normalizedQuery,

          fundIsin,

          scoreVersion: SCORING_ALGORITHM_VERSION,

          promptVersion,

          locale,

          response,

          expiresAt: computeAssistantCacheExpiry(
            this.config.assistantCacheTtlDays,
          ),
        });

        return response;
      }
    }

    if (!this.config.assistantEnabled) {
      throw new ServiceUnavailableException(
        'El asistente SORA no está disponible en este entorno.',
      );
    }

    const response = await this.generateLayeredResponse(
      context,

      request.message,

      intent,

      fundIsin,

      promptVersion,
    );

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

    const intent = this.intentClassifier.classify(
      request.message,

      requestedFundIsins.length > 0,
    );

    const normalizedQuery = normalizeAssistantQuery(request.message);

    const fundIsin =
      requestedFundIsins.length === 1 ? requestedFundIsins[0] : undefined;

    const isIsolatedTurn = recentMessages.length === 0;

    if (isIsolatedTurn) {
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
        const response = this.guardrails.assertResponse({
          ...cached,

          source: 'cache',

          cached: true,

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
    }

    const context = await this.contextBuilder.build(
      request,

      intent,

      recentMessages,
    );

    if (
      isIsolatedTurn &&
      this.intentClassifier.supportsDeterministicTemplate(intent)
    ) {
      const template = this.deterministicAssistant.tryBuild(context, intent);

      if (template !== null) {
        const response = this.guardrails.assertResponse({
          title: template.title,

          text: template.text,

          source: 'template',

          cached: false,

          disclaimer: ASSISTANT_EDUCATIONAL_DISCLAIMER,

          relatedFundIsin: fundIsin,

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
    }

    if (!this.config.assistantEnabled) {
      throw new ServiceUnavailableException(
        'El asistente SORA no está disponible en este entorno.',
      );
    }

    const response = this.guardrails.assertResponse({
      ...(await this.generateLayeredResponse(
        context,

        request.message,

        intent,

        fundIsin,

        promptVersion,
      )),

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

  private async generateLayeredResponse(
    context: Awaited<ReturnType<AssistantContextBuilderService['build']>>,

    message: string,

    intent: string,

    fundIsin: string | undefined,

    promptVersion: string,
  ): Promise<AssistantExplainResponse> {
    if (this.config.assistantRuntime === 'python-agent') {
      const generatedText = await this.pythonAgentAssistant.generate(
        context,

        message,
      );

      const sanitizedText = this.guardrails.sanitizeOrFallback(generatedText);

      return {
        title: this.buildTitle(message, intent),

        text: sanitizedText,

        source: 'openai',

        cached: false,

        disclaimer: ASSISTANT_EDUCATIONAL_DISCLAIMER,

        relatedFundIsin: fundIsin,

        promptVersion,
      };
    }

    const ragChunks = this.ragService.retrieve(message, context.intent).chunks;

    const llmResult = await this.llmOrchestrator.generate(
      context,

      message,

      ragChunks,
    );

    return {
      title: this.buildTitle(message, intent),

      text: llmResult.text,

      source: llmResult.source,

      cached: false,

      disclaimer: ASSISTANT_EDUCATIONAL_DISCLAIMER,

      relatedFundIsin: fundIsin,

      promptVersion,

      model: llmResult.model,

      confidence: llmResult.confidence,

      fallbackReason: llmResult.fallbackReason,
    };
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

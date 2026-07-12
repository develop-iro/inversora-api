import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { AppConfigService } from '../../../shared/config/config.service';
import type {
  AssistantFallbackReason,
  AssistantResponseSource,
} from '../entities/assistant-context.schema';
import {
  buildAssistantUserPrompt,
  SORA_SYSTEM_PROMPT,
} from '../entities/assistant-system-prompt';
import type { AssistantRagChunk } from '../entities/assistant-rag.data';
import { AssistantConfidenceService } from './assistant-confidence.service';
import type { AssistantPromptContext } from './assistant-context.builder';
import { AssistantOutputGuardrailsService } from './assistant-output.guardrails';
import { AssistantLlmUsageService } from './assistant-llm-usage.service';
import { LlmChatCompletionService } from './llm-chat-completion.service';

export type AssistantLlmGenerationResult = {
  readonly text: string;
  readonly source: AssistantResponseSource;
  readonly model: string;
  readonly confidence?: number;
  readonly fallbackReason?: AssistantFallbackReason;
};

/**
 * Runs Qwen as primary LLM with OpenAI fallback on low confidence or errors.
 */
@Injectable()
export class AssistantLlmOrchestratorService {
  constructor(
    private readonly config: AppConfigService,
    private readonly llmCompletion: LlmChatCompletionService,
    private readonly confidenceService: AssistantConfidenceService,
    private readonly guardrails: AssistantOutputGuardrailsService,
    private readonly usage: AssistantLlmUsageService,
  ) {}

  /**
   * Generates an assistant reply using RAG context and layered LLM providers.
   *
   * @param context - Factual assistant context.
   * @param message - User question.
   * @param ragChunks - Retrieved educational document chunks.
   */
  async generate(
    context: AssistantPromptContext,
    message: string,
    ragChunks: readonly AssistantRagChunk[],
  ): Promise<AssistantLlmGenerationResult> {
    const ragContext = ragChunks
      .map(
        (chunk, index) =>
          `[Doc ${index + 1} | ${chunk.topic} | ${chunk.sourceFile}]\n${chunk.content}`,
      )
      .join('\n\n');
    const userPrompt = buildAssistantUserPrompt(
      message,
      context.intent,
      JSON.stringify(context, null, 2),
      ragContext.length > 0 ? ragContext : undefined,
    );

    await this.usage.reserveCall();

    try {
      const primaryText = await this.llmCompletion.complete({
        apiKey: this.config.assistantLlmPrimaryApiKey,
        baseUrl: this.config.assistantLlmPrimaryBaseUrl,
        model: this.config.assistantLlmPrimaryModel,
        systemPrompt: SORA_SYSTEM_PROMPT,
        userPrompt,
      });
      const sanitizedPrimary = this.guardrails.sanitizeOrFallback(primaryText);
      const primaryGuardrailsPass = sanitizedPrimary === primaryText.trim();
      const primaryConfidence = this.confidenceService.evaluate({
        text: sanitizedPrimary,
        intent: context.intent,
        context,
        guardrailsPass: primaryGuardrailsPass,
      });

      if (!primaryGuardrailsPass) {
        return this.generateFallback(
          userPrompt,
          context,
          sanitizedPrimary,
          primaryConfidence.score,
          'guardrails',
        );
      }

      if (
        primaryConfidence.score >=
        this.config.assistantFallbackConfidenceThreshold
      ) {
        return {
          text: sanitizedPrimary,
          source: 'qwen',
          model: this.config.assistantLlmPrimaryModel,
          confidence: primaryConfidence.score,
        };
      }

      return this.generateFallback(
        userPrompt,
        context,
        sanitizedPrimary,
        primaryConfidence.score,
        'low_confidence',
      );
    } catch {
      return this.generateFallback(
        userPrompt,
        context,
        undefined,
        undefined,
        'error',
      );
    }
  }

  private async generateFallback(
    userPrompt: string,
    context: AssistantPromptContext,
    primaryText: string | undefined,
    primaryConfidence: number | undefined,
    reason: AssistantFallbackReason,
  ): Promise<AssistantLlmGenerationResult> {
    const fallbackApiKey = this.config.openAiApiKey;

    if (
      !this.config.assistantOpenAiFallbackEnabled ||
      fallbackApiKey === undefined
    ) {
      if (primaryText !== undefined) {
        return {
          text: primaryText,
          source: 'qwen',
          model: this.config.assistantLlmPrimaryModel,
          confidence: primaryConfidence,
          fallbackReason: reason,
        };
      }

      throw new ServiceUnavailableException(
        'El asistente SORA no está disponible en este entorno.',
      );
    }

    await this.usage.reserveCall();

    try {
      const fallbackText = await this.llmCompletion.complete({
        apiKey: fallbackApiKey,
        model: this.config.openAiModel,
        systemPrompt: SORA_SYSTEM_PROMPT,
        userPrompt,
      });
      const sanitizedFallback =
        this.guardrails.sanitizeOrFallback(fallbackText);

      return {
        text: sanitizedFallback,
        source: 'openai-fallback',
        model: this.config.openAiModel,
        confidence: primaryConfidence,
        fallbackReason: reason,
      };
    } catch (error: unknown) {
      if (primaryText !== undefined) {
        return {
          text: primaryText,
          source: 'qwen',
          model: this.config.assistantLlmPrimaryModel,
          confidence: primaryConfidence,
          fallbackReason: reason,
        };
      }

      throw error;
    }
  }
}

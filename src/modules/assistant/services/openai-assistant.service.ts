import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';

import { AppConfigService } from '../../../shared/config/config.service';
import {
  buildAssistantUserPrompt,
  SORA_SYSTEM_PROMPT,
} from '../entities/assistant-system-prompt';
import type { AssistantPromptContext } from './assistant-context.builder';

/**
 * Generates SORA assistant completions via the OpenAI API.
 */
@Injectable()
export class OpenAiAssistantService {
  private client: OpenAI | null = null;

  constructor(private readonly config: AppConfigService) {}

  /**
   * Generates an educational assistant reply using OpenAI chat completions.
   *
   * @param context - Factual assistant context.
   * @param message - User question.
   */
  async generate(
    context: AssistantPromptContext,
    message: string,
  ): Promise<string> {
    if (!this.config.assistantEnabled) {
      throw new ServiceUnavailableException(
        'El asistente SORA no está disponible en este entorno.',
      );
    }

    const apiKey = this.config.openAiApiKey;

    if (apiKey === undefined) {
      throw new ServiceUnavailableException(
        'El asistente SORA no está configurado correctamente.',
      );
    }

    if (this.client === null) {
      this.client = new OpenAI({ apiKey });
    }

    const completion = await this.client.chat.completions.create({
      model: this.config.openAiModel,
      temperature: 0.3,
      max_tokens: 500,
      messages: [
        { role: 'system', content: SORA_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildAssistantUserPrompt(
            message,
            context.intent,
            JSON.stringify(context, null, 2),
          ),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim();

    if (content === undefined || content.length === 0) {
      throw new ServiceUnavailableException(
        'SORA no pudo generar una respuesta en este momento.',
      );
    }

    return content;
  }
}

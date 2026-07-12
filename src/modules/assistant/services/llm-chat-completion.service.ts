import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';

export type LlmChatCompletionInput = {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly model: string;
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
};

/**
 * OpenAI-compatible chat completion client (Qwen, OpenAI, OpenRouter, etc.).
 */
@Injectable()
export class LlmChatCompletionService {
  private readonly clients = new Map<string, OpenAI>();

  /**
   * Generates a chat completion using an OpenAI-compatible API.
   *
   * @param input - Provider credentials and prompt payload.
   */
  async complete(input: LlmChatCompletionInput): Promise<string> {
    const client = this.getClient(input.apiKey, input.baseUrl);

    const completion = await client.chat.completions.create({
      model: input.model,
      temperature: input.temperature ?? 0.3,
      max_tokens: input.maxTokens ?? 500,
      messages: [
        { role: 'system', content: input.systemPrompt },
        { role: 'user', content: input.userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim();

    if (content === undefined || content.length === 0) {
      throw new ServiceUnavailableException(
        'El modelo no pudo generar una respuesta en este momento.',
      );
    }

    return content;
  }

  private getClient(apiKey: string, baseUrl?: string): OpenAI {
    const cacheKey = `${apiKey}:${baseUrl ?? 'default'}`;
    const existing = this.clients.get(cacheKey);

    if (existing !== undefined) {
      return existing;
    }

    const client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
    });
    this.clients.set(cacheKey, client);

    return client;
  }
}

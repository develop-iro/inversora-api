import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { z } from 'zod';

import { AppConfigService } from '../../../shared/config/config.service';
import { HttpClientService } from '../../../shared/http/http-client.service';
import type { AssistantPromptContext } from './assistant-context.builder';

const pythonAgentResponseSchema = z.object({
  text: z.string().trim().min(1),
  source: z.literal('openai-agents'),
  model: z.string().min(1),
});

/**
 * Calls the internal Python SORA agent runtime.
 */
@Injectable()
export class PythonAgentAssistantService {
  constructor(
    private readonly config: AppConfigService,
    private readonly httpClient: HttpClientService,
  ) {}

  /**
   * Generates an educational assistant reply through the Python agent service.
   *
   * @param context - Factual assistant context built by NestJS.
   * @param message - User question.
   */
  async generate(
    context: AssistantPromptContext,
    message: string,
  ): Promise<string> {
    const url = new URL('/agent/respond', this.config.assistantAgentBaseUrl);
    const agentApiKey = this.config.assistantAgentApiKey;

    if (agentApiKey === undefined) {
      throw new ServiceUnavailableException(
        'El runtime Python de SORA no está configurado correctamente.',
      );
    }

    try {
      const response = await this.httpClient.post<unknown>(
        url.toString(),
        {
          message,
          surface: context.surface,
          locale: context.locale,
          session_id: context.sessionId,
          context,
        },
        {
          provider: 'sora-agent',
          timeout: this.config.assistantAgentTimeoutMs,
          retries: 1,
          headers: {
            'X-Sora-Agent-Api-Key': agentApiKey,
          },
        },
      );

      const parsed = pythonAgentResponseSchema.safeParse(response.data);

      if (!parsed.success) {
        throw new Error('Invalid SORA agent response contract');
      }

      return parsed.data.text;
    } catch (error: unknown) {
      throw new ServiceUnavailableException(
        'El runtime Python de SORA no esta disponible en este momento.',
        { cause: error },
      );
    }
  }
}

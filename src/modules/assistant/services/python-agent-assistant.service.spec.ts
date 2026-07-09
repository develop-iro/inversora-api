import { ServiceUnavailableException } from '@nestjs/common';

import { AppConfigService } from '../../../shared/config/config.service';
import { HttpClientService } from '../../../shared/http/http-client.service';
import { PythonAgentAssistantService } from './python-agent-assistant.service';

describe('PythonAgentAssistantService', () => {
  let service: PythonAgentAssistantService;
  let config: {
    assistantAgentBaseUrl: string;
    assistantAgentTimeoutMs: number;
    assistantAgentApiKey: string;
  };
  let httpClient: { post: jest.Mock };

  beforeEach(() => {
    config = {
      assistantAgentBaseUrl: 'http://localhost:8001',
      assistantAgentTimeoutMs: 5_000,
      assistantAgentApiKey: 'change-me-local-agent-key-16',
    };
    httpClient = {
      post: jest.fn(),
    };
    service = new PythonAgentAssistantService(
      config as AppConfigService,
      httpClient as unknown as HttpClientService,
    );
  });

  it('returns text from the Python agent runtime', async () => {
    httpClient.post.mockResolvedValue({
      data: {
        text: 'Respuesta educativa.',
        source: 'openai-agents',
        model: 'gpt-4o-mini',
      },
    });

    const response = await service.generate(
      {
        surface: 'home',
        intent: 'general',
        locale: 'es',
        userMessage: 'Hola',
        sessionId: 'session-1',
      },
      'Hola',
    );

    expect(response).toBe('Respuesta educativa.');
    expect(httpClient.post).toHaveBeenCalledWith(
      'http://localhost:8001/agent/respond',
      {
        message: 'Hola',
        surface: 'home',
        locale: 'es',
        session_id: 'session-1',
        context: {
          surface: 'home',
          intent: 'general',
          locale: 'es',
          userMessage: 'Hola',
          sessionId: 'session-1',
        },
      },
      {
        provider: 'sora-agent',
        timeout: 5_000,
        retries: 1,
        headers: {
          'X-Sora-Agent-Api-Key': 'change-me-local-agent-key-16',
        },
      },
    );
  });

  it('throws a service unavailable error when the response contract is invalid', async () => {
    httpClient.post.mockResolvedValue({
      data: {
        text: '',
        source: 'openai-agents',
        model: 'gpt-4o-mini',
      },
    });

    await expect(
      service.generate(
        {
          surface: 'home',
          intent: 'general',
          locale: 'es',
          userMessage: 'Hola',
        },
        'Hola',
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('throws a service unavailable error when the HTTP client fails', async () => {
    httpClient.post.mockRejectedValue(new Error('network down'));

    await expect(
      service.generate(
        {
          surface: 'home',
          intent: 'general',
          locale: 'es',
          userMessage: 'Hola',
        },
        'Hola',
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('throws a service unavailable error when the agent API key is missing', async () => {
    config.assistantAgentApiKey = undefined as unknown as string;

    await expect(
      service.generate(
        {
          surface: 'home',
          intent: 'general',
          locale: 'es',
          userMessage: 'Hola',
        },
        'Hola',
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(httpClient.post).not.toHaveBeenCalled();
  });
});

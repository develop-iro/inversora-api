import { ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';

import { LlmChatCompletionService } from './llm-chat-completion.service';

jest.mock('openai');

describe('LlmChatCompletionService', () => {
  const service = new LlmChatCompletionService();
  const createMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
      () =>
        ({
          chat: {
            completions: {
              create: createMock,
            },
          },
        }) as unknown as OpenAI,
    );
  });

  it('returns trimmed completion content', async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: '  Respuesta educativa  ' } }],
    });

    await expect(
      service.complete({
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
        systemPrompt: 'system',
        userPrompt: 'user',
      }),
    ).resolves.toBe('Respuesta educativa');

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 500,
      }),
    );
  });

  it('honors custom temperature and token limits', async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: 'ok' } }],
    });

    await service.complete({
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      systemPrompt: 'system',
      userPrompt: 'user',
      temperature: 0.1,
      maxTokens: 120,
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.1,
        max_tokens: 120,
      }),
    );
  });

  it('reuses OpenAI clients for the same credentials', async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: 'ok' } }],
    });

    await service.complete({
      apiKey: 'shared-key',
      baseUrl: 'https://example.com/v1',
      model: 'gpt-4o-mini',
      systemPrompt: 'system',
      userPrompt: 'first',
    });
    await service.complete({
      apiKey: 'shared-key',
      baseUrl: 'https://example.com/v1',
      model: 'gpt-4o-mini',
      systemPrompt: 'system',
      userPrompt: 'second',
    });

    expect(OpenAI).toHaveBeenCalledTimes(1);
  });

  it('throws when the model returns empty content', async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: '   ' } }],
    });

    await expect(
      service.complete({
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
        systemPrompt: 'system',
        userPrompt: 'user',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('throws when the model returns no message content', async () => {
    createMock.mockResolvedValue({
      choices: [{ message: {} }],
    });

    await expect(
      service.complete({
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
        systemPrompt: 'system',
        userPrompt: 'user',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('throws when the model returns no choices', async () => {
    createMock.mockResolvedValue({
      choices: [],
    });

    await expect(
      service.complete({
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
        systemPrompt: 'system',
        userPrompt: 'user',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

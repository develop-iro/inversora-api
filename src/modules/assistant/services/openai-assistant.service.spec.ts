import OpenAI from 'openai';
import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AppConfigService } from '../../../shared/config/config.service';
import { OpenAiAssistantService } from './openai-assistant.service';

const createMock = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: createMock,
      },
    },
  })),
}));

describe('OpenAiAssistantService', () => {
  let service: OpenAiAssistantService;
  let config: {
    assistantEnabled: boolean;
    openAiApiKey?: string;
    openAiModel: string;
  };

  beforeEach(async () => {
    createMock.mockReset();
    config = {
      assistantEnabled: true,
      openAiApiKey: 'test-openai-key',
      openAiModel: 'gpt-4o-mini',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAiAssistantService,
        {
          provide: AppConfigService,
          useValue: config,
        },
      ],
    }).compile();

    service = module.get(OpenAiAssistantService);
  });

  it('throws when the assistant is disabled', async () => {
    config.assistantEnabled = false;

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

  it('throws when the OpenAI API key is missing', async () => {
    config.openAiApiKey = undefined;

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

  it('returns trimmed completion content', async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: '  Respuesta educativa.  ' } }],
    });

    const response = await service.generate(
      {
        surface: 'home',
        intent: 'general',
        locale: 'es',
        userMessage: '¿Qué es un índice?',
      },
      '¿Qué es un índice?',
    );

    expect(response).toBe('Respuesta educativa.');
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini',
      }),
    );
  });

  it('reuses the OpenAI client across requests', async () => {
    (OpenAI as unknown as jest.Mock).mockClear();
    createMock.mockResolvedValue({
      choices: [{ message: { content: 'Respuesta.' } }],
    });

    await service.generate(
      {
        surface: 'home',
        intent: 'general',
        locale: 'es',
        userMessage: 'Hola',
      },
      'Hola',
    );
    await service.generate(
      {
        surface: 'home',
        intent: 'general',
        locale: 'es',
        userMessage: 'Otra',
      },
      'Otra',
    );

    expect(OpenAI).toHaveBeenCalledTimes(1);
  });

  it('throws when OpenAI returns empty content', async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: '   ' } }],
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

  it('throws when OpenAI returns no choices', async () => {
    createMock.mockResolvedValue({ choices: [] });

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
});

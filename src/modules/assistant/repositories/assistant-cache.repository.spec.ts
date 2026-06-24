import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../shared/database/prisma.service';
import { AssistantCacheRepository } from './assistant-cache.repository';

describe('AssistantCacheRepository', () => {
  let repository: AssistantCacheRepository;
  let prisma: {
    assistantResponseCache: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      assistantResponseCache: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssistantCacheRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get(AssistantCacheRepository);
  });

  it('returns null for missing cache entries', async () => {
    prisma.assistantResponseCache.findUnique.mockResolvedValue(null);

    await expect(repository.findValid('missing-key')).resolves.toBeNull();
  });

  it('returns null for expired cache entries', async () => {
    prisma.assistantResponseCache.findUnique.mockResolvedValue({
      expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      responseJson: {},
    });

    await expect(repository.findValid('expired-key')).resolves.toBeNull();
  });

  it('returns null when cached JSON is invalid', async () => {
    prisma.assistantResponseCache.findUnique.mockResolvedValue({
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      responseJson: { text: 'incomplete' },
    });

    await expect(repository.findValid('invalid-key')).resolves.toBeNull();
  });

  it('returns valid cached responses', async () => {
    prisma.assistantResponseCache.findUnique.mockResolvedValue({
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      responseJson: {
        title: 'TER',
        text: 'Es la comisión anual.',
        source: 'glossary',
        cached: true,
        disclaimer: 'Educativo.',
        promptVersion: 'sora-v1',
      },
    });

    await expect(repository.findValid('valid-key')).resolves.toEqual({
      title: 'TER',
      text: 'Es la comisión anual.',
      source: 'glossary',
      cached: true,
      disclaimer: 'Educativo.',
      promptVersion: 'sora-v1',
    });
  });

  it('persists cache entries with upsert', async () => {
    const expiresAt = new Date('2099-01-01T00:00:00.000Z');

    await repository.save({
      cacheKey: 'cache-key',
      intent: 'general',
      normalizedQuery: 'que es ter',
      scoreVersion: 'rn-04',
      promptVersion: 'sora-v1',
      locale: 'es',
      response: {
        title: 'TER',
        text: 'Comisión.',
        source: 'glossary',
        cached: false,
        disclaimer: 'Educativo.',
        promptVersion: 'sora-v1',
      },
      expiresAt,
    });

    expect(prisma.assistantResponseCache.upsert).toHaveBeenCalledWith({
      where: { cacheKey: 'cache-key' },
      create: {
        cacheKey: 'cache-key',
        intent: 'general',
        normalizedQuery: 'que es ter',
        fundIsin: null,
        scoreVersion: 'rn-04',
        promptVersion: 'sora-v1',
        locale: 'es',
        responseJson: {
          title: 'TER',
          text: 'Comisión.',
          source: 'glossary',
          cached: false,
          disclaimer: 'Educativo.',
          promptVersion: 'sora-v1',
        },
        expiresAt,
      },
      update: {
        intent: 'general',
        normalizedQuery: 'que es ter',
        fundIsin: null,
        scoreVersion: 'rn-04',
        promptVersion: 'sora-v1',
        locale: 'es',
        responseJson: {
          title: 'TER',
          text: 'Comisión.',
          source: 'glossary',
          cached: false,
          disclaimer: 'Educativo.',
          promptVersion: 'sora-v1',
        },
        expiresAt,
      },
    });
  });

  it('persists optional fund ISIN values', async () => {
    const expiresAt = new Date('2099-01-01T00:00:00.000Z');

    await repository.save({
      cacheKey: 'cache-key-fund',
      intent: 'explain_score',
      normalizedQuery: 'score',
      fundIsin: 'US78462F1030',
      scoreVersion: 'rn-04',
      promptVersion: 'sora-v1',
      locale: 'es',
      response: {
        title: 'Score',
        text: 'Explicación.',
        source: 'openai',
        cached: false,
        disclaimer: 'Educativo.',
        promptVersion: 'sora-v1',
      },
      expiresAt,
    });

    expect(prisma.assistantResponseCache.upsert).toHaveBeenCalledWith({
      where: { cacheKey: 'cache-key-fund' },
      create: {
        cacheKey: 'cache-key-fund',
        intent: 'explain_score',
        normalizedQuery: 'score',
        fundIsin: 'US78462F1030',
        scoreVersion: 'rn-04',
        promptVersion: 'sora-v1',
        locale: 'es',
        responseJson: {
          title: 'Score',
          text: 'Explicación.',
          source: 'openai',
          cached: false,
          disclaimer: 'Educativo.',
          promptVersion: 'sora-v1',
        },
        expiresAt,
      },
      update: {
        intent: 'explain_score',
        normalizedQuery: 'score',
        fundIsin: 'US78462F1030',
        scoreVersion: 'rn-04',
        promptVersion: 'sora-v1',
        locale: 'es',
        responseJson: {
          title: 'Score',
          text: 'Explicación.',
          source: 'openai',
          cached: false,
          disclaimer: 'Educativo.',
          promptVersion: 'sora-v1',
        },
        expiresAt,
      },
    });
  });
});

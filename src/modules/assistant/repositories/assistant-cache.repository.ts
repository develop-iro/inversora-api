import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/database/prisma.service';
import type { AssistantExplainResponse } from '../entities/assistant-context.schema';
import type { AssistantIntent } from '../entities/assistant-context.schema';
import { assistantExplainResponseSchema } from '../entities/assistant-context.schema';

/** Input for persisting an assistant cache entry. */
export type SaveAssistantCacheInput = {
  cacheKey: string;
  intent: AssistantIntent;
  normalizedQuery: string;
  fundIsin?: string;
  scoreVersion: string;
  promptVersion: string;
  locale: string;
  response: AssistantExplainResponse;
  expiresAt: Date;
};

/**
 * PostgreSQL persistence for cached SORA assistant responses.
 */
@Injectable()
export class AssistantCacheRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a non-expired cached response by cache key.
   *
   * @param cacheKey - Deterministic cache key hash.
   */
  async findValid(cacheKey: string): Promise<AssistantExplainResponse | null> {
    const record = await this.prisma.assistantResponseCache.findUnique({
      where: { cacheKey },
    });

    if (record === null || record.expiresAt <= new Date()) {
      return null;
    }

    const parsed = assistantExplainResponseSchema.safeParse(
      record.responseJson,
    );

    if (!parsed.success) {
      return null;
    }

    return parsed.data;
  }

  /**
   * Persists or updates a cached assistant response.
   *
   * @param input - Cache entry payload.
   */
  async save(input: SaveAssistantCacheInput): Promise<void> {
    await this.prisma.assistantResponseCache.upsert({
      where: { cacheKey: input.cacheKey },
      create: {
        cacheKey: input.cacheKey,
        intent: input.intent,
        normalizedQuery: input.normalizedQuery,
        fundIsin: input.fundIsin ?? null,
        scoreVersion: input.scoreVersion,
        promptVersion: input.promptVersion,
        locale: input.locale,
        responseJson: input.response,
        expiresAt: input.expiresAt,
      },
      update: {
        intent: input.intent,
        normalizedQuery: input.normalizedQuery,
        fundIsin: input.fundIsin ?? null,
        scoreVersion: input.scoreVersion,
        promptVersion: input.promptVersion,
        locale: input.locale,
        responseJson: input.response,
        expiresAt: input.expiresAt,
      },
    });
  }
}

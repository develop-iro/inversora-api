import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/database/prisma.service';

type AssistantLlmUsageDelegate = {
  upsert(input: {
    where: { periodKey: string };
    create: { periodKey: string; count: number };
    update: { count: { increment: number } };
    select: { count: true };
  }): Promise<{ count: number }>;
};

type AssistantLlmUsagePrismaClient = {
  assistantLlmUsageCounter: AssistantLlmUsageDelegate;
};

/**
 * Persists aggregate LLM usage counters for budget enforcement.
 */
@Injectable()
export class AssistantLlmUsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Atomically increments one period counter and returns its new value.
   */
  async increment(periodKey: string): Promise<number> {
    const prisma = this.prisma as unknown as AssistantLlmUsagePrismaClient;
    const record = await prisma.assistantLlmUsageCounter.upsert({
      where: { periodKey },
      create: { periodKey, count: 1 },
      update: { count: { increment: 1 } },
      select: { count: true },
    });

    return record.count;
  }
}

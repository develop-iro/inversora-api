import { PrismaService } from '../../../shared/database/prisma.service';
import { AssistantLlmUsageRepository } from './assistant-llm-usage.repository';

describe('AssistantLlmUsageRepository', () => {
  it('atomically increments a usage period counter', async () => {
    const upsert = jest.fn().mockResolvedValue({ count: 3 });
    const prisma = {
      assistantLlmUsageCounter: {
        upsert,
      },
    } as unknown as PrismaService;
    const repository = new AssistantLlmUsageRepository(prisma);

    await expect(repository.increment('daily:2026-07-12')).resolves.toBe(3);

    expect(upsert).toHaveBeenCalledWith({
      where: { periodKey: 'daily:2026-07-12' },
      create: { periodKey: 'daily:2026-07-12', count: 1 },
      update: { count: { increment: 1 } },
      select: { count: true },
    });
  });
});

import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { AppConfigService } from '../../../shared/config/config.service';
import { AssistantLlmUsageRepository } from '../repositories/assistant-llm-usage.repository';

/**
 * Enforces coarse daily and monthly LLM call budgets.
 */
@Injectable()
export class AssistantLlmUsageService {
  constructor(
    private readonly config: AppConfigService,
    private readonly repository: AssistantLlmUsageRepository,
  ) {}

  /**
   * Reserves one LLM call or fails closed when configured limits are exceeded.
   */
  async reserveCall(now: Date = new Date()): Promise<void> {
    const dailyLimit = this.config.assistantDailyLlmLimit;
    const monthlyLimit = this.config.assistantMonthlyLlmLimit;

    if (dailyLimit <= 0 && monthlyLimit <= 0) {
      return;
    }

    const dayKey = `daily:${now.toISOString().slice(0, 10)}`;
    const monthKey = `monthly:${now.toISOString().slice(0, 7)}`;

    if (dailyLimit > 0) {
      const dailyCount = await this.repository.increment(dayKey);
      if (dailyCount > dailyLimit) {
        throw new ServiceUnavailableException(
          'El asistente SORA ha alcanzado temporalmente su limite diario de uso.',
        );
      }
    }

    if (monthlyLimit > 0) {
      const monthlyCount = await this.repository.increment(monthKey);
      if (monthlyCount > monthlyLimit) {
        throw new ServiceUnavailableException(
          'El asistente SORA ha alcanzado temporalmente su limite mensual de uso.',
        );
      }
    }
  }
}

import { ServiceUnavailableException } from '@nestjs/common';

import { AppConfigService } from '../../../shared/config/config.service';
import { AssistantLlmUsageRepository } from '../repositories/assistant-llm-usage.repository';
import { AssistantLlmUsageService } from './assistant-llm-usage.service';

describe('AssistantLlmUsageService', () => {
  let repository: { increment: jest.Mock };
  let config: {
    assistantDailyLlmLimit: number;
    assistantMonthlyLlmLimit: number;
  };
  let service: AssistantLlmUsageService;

  beforeEach(() => {
    repository = {
      increment: jest.fn().mockResolvedValue(1),
    };
    config = {
      assistantDailyLlmLimit: 0,
      assistantMonthlyLlmLimit: 0,
    };
    service = new AssistantLlmUsageService(
      config as AppConfigService,
      repository as unknown as AssistantLlmUsageRepository,
    );
  });

  it('does nothing when limits are disabled', async () => {
    await service.reserveCall(new Date('2026-07-12T10:00:00.000Z'));

    expect(repository.increment).not.toHaveBeenCalled();
  });

  it('increments daily and monthly counters when limits are enabled', async () => {
    config.assistantDailyLlmLimit = 10;
    config.assistantMonthlyLlmLimit = 100;

    await service.reserveCall(new Date('2026-07-12T10:00:00.000Z'));

    expect(repository.increment).toHaveBeenCalledWith('daily:2026-07-12');
    expect(repository.increment).toHaveBeenCalledWith('monthly:2026-07');
  });

  it('fails closed when the daily limit is exceeded', async () => {
    config.assistantDailyLlmLimit = 1;
    repository.increment.mockResolvedValueOnce(2);

    await expect(
      service.reserveCall(new Date('2026-07-12T10:00:00.000Z')),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('fails closed when the monthly limit is exceeded', async () => {
    config.assistantMonthlyLlmLimit = 1;
    repository.increment.mockResolvedValueOnce(2);

    await expect(
      service.reserveCall(new Date('2026-07-12T10:00:00.000Z')),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

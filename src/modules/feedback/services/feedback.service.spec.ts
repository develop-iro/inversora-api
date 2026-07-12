import { Logger } from '@nestjs/common';

import { ProductFeedbackRepository } from '../repositories/product-feedback.repository';
import { FeedbackService } from './feedback.service';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let repository: { create: jest.Mock };
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    repository = {
      create: jest.fn().mockResolvedValue(undefined),
    };
    service = new FeedbackService(
      repository as unknown as ProductFeedbackRepository,
    );
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('should log and persist structured feedback events', async () => {
    service.recordFeedback({
      clarity: 'yes',
      wouldReturn: 'yes',
      message: 'Muy clara.',
      surface: 'feedback',
    });

    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'product_feedback',
        clarity: 'yes',
        wouldReturn: 'yes',
        surface: 'feedback',
        hasMessage: true,
      }),
    );
    expect(repository.create).toHaveBeenCalledTimes(1);

    await Promise.resolve();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('should warn when persistence fails without throwing', async () => {
    repository.create.mockRejectedValue(new Error('database unavailable'));

    service.recordFeedback({
      clarity: 'no',
      wouldReturn: 'no',
      surface: 'feedback',
    });

    await Promise.resolve();

    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to persist product feedback: database unavailable',
    );
  });

  it('should log empty messages and warn unknown persistence errors', async () => {
    repository.create.mockRejectedValue('database unavailable');

    service.recordFeedback({
      clarity: 'somewhat',
      wouldReturn: 'maybe',
      message: '',
      surface: 'feedback',
    });

    await Promise.resolve();

    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'product_feedback',
        clarity: 'somewhat',
        wouldReturn: 'maybe',
        surface: 'feedback',
        hasMessage: false,
      }),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to persist product feedback: unknown error',
    );
  });
});

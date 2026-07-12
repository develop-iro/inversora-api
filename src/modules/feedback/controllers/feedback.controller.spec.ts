import { Test, TestingModule } from '@nestjs/testing';

import { FeedbackController } from './feedback.controller';
import { FeedbackService } from '../services/feedback.service';

describe('FeedbackController', () => {
  let controller: FeedbackController;
  let recordFeedback: jest.Mock;

  beforeEach(async () => {
    recordFeedback = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedbackController],
      providers: [
        {
          provide: FeedbackService,
          useValue: { recordFeedback },
        },
      ],
    }).compile();

    controller = module.get<FeedbackController>(FeedbackController);
  });

  it('should accept valid feedback payloads', () => {
    const response = controller.recordFeedback({
      clarity: 'somewhat',
      wouldReturn: 'maybe',
      message: 'Me gustaría más contexto en el ranking.',
      surface: 'feedback',
    });

    expect(response).toEqual({ accepted: true });
    expect(recordFeedback).toHaveBeenCalledWith({
      clarity: 'somewhat',
      wouldReturn: 'maybe',
      message: 'Me gustaría más contexto en el ranking.',
      surface: 'feedback',
    });
  });
});

import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ScoringService } from '../services/scoring.service';
import { ScoringController } from './scoring.controller';

describe('ScoringController', () => {
  let controller: ScoringController;
  let scoringService: { calculateScoreForFundId: jest.Mock };

  const fundId = '550e8400-e29b-41d4-a716-446655440000';
  const score = {
    score: 82,
    version: 'mvp-1',
    breakdown: {},
    summary: 'Score summary',
    warnings: [],
  };

  beforeEach(async () => {
    scoringService = {
      calculateScoreForFundId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScoringController],
      providers: [
        {
          provide: ScoringService,
          useValue: scoringService,
        },
      ],
    }).compile();

    controller = module.get(ScoringController);
  });

  it('should return the computed score for a fund', async () => {
    scoringService.calculateScoreForFundId.mockResolvedValue(score);

    await expect(controller.getFundScore(fundId)).resolves.toEqual(score);
    expect(scoringService.calculateScoreForFundId).toHaveBeenCalledWith(fundId);
  });

  it('should throw when the fund does not exist', async () => {
    scoringService.calculateScoreForFundId.mockResolvedValue(null);

    await expect(controller.getFundScore(fundId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ScoringReadService } from '../services/scoring-read.service';
import { ScoringController } from './scoring.controller';

describe('ScoringController', () => {
  let controller: ScoringController;
  let scoringReadService: { getPersistedScoreByFundId: jest.Mock };

  const fundId = '550e8400-e29b-41d4-a716-446655440000';
  const score = {
    score: 82,
    version: 'rn-04',
    breakdown: {},
    summary: 'Score summary',
    warnings: [],
  };

  beforeEach(async () => {
    scoringReadService = {
      getPersistedScoreByFundId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScoringController],
      providers: [
        {
          provide: ScoringReadService,
          useValue: scoringReadService,
        },
      ],
    }).compile();

    controller = module.get(ScoringController);
  });

  it('should return the computed score for a fund', async () => {
    scoringReadService.getPersistedScoreByFundId.mockResolvedValue(score);

    await expect(controller.getFundScore(fundId)).resolves.toEqual(score);
    expect(scoringReadService.getPersistedScoreByFundId).toHaveBeenCalledWith(
      fundId,
    );
  });

  it('should throw when the fund does not exist', async () => {
    scoringReadService.getPersistedScoreByFundId.mockResolvedValue(null);

    await expect(controller.getFundScore(fundId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

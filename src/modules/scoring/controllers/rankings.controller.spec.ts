import { Test, TestingModule } from '@nestjs/testing';
import { RankingsController } from './rankings.controller';
import { RankingsService } from '../services/rankings.service';

describe('RankingsController', () => {
  let controller: RankingsController;
  let rankingsService: { getRankings: jest.Mock };

  const response = {
    data: [
      {
        benchmark: 'S&P 500',
        benchmarkKey: 's&p 500',
        total: 2,
        funds: [
          {
            rank: 1,
            id: '22222222-2222-4222-8222-222222222222',
            symbol: 'IVV',
            isin: 'US4642872000',
            name: 'iShares Core S&P 500 ETF',
            score: 92,
            benchmark: 'S&P 500',
            currency: 'USD',
            riskLevel: 4,
            ter: 0.03,
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    rankingsService = {
      getRankings: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RankingsController],
      providers: [
        {
          provide: RankingsService,
          useValue: rankingsService,
        },
      ],
    }).compile();

    controller = module.get(RankingsController);
  });

  it('should delegate rankings requests to the service', async () => {
    rankingsService.getRankings.mockResolvedValue(response);

    await expect(
      controller.getRankings({ benchmark: 'S&P 500', limit: '5' }),
    ).resolves.toEqual(response);
    expect(rankingsService.getRankings).toHaveBeenCalledWith({
      benchmark: 'S&P 500',
      limit: '5',
    });
  });
});

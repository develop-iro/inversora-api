import { Test, TestingModule } from '@nestjs/testing';
import type { RankingsResponse } from '../entities/ranking.schema';
import { GetRankingsUseCase } from '../get-rankings';
import { RankingsService } from './rankings.service';

describe('RankingsService', () => {
  let service: RankingsService;
  let getRankingsUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    getRankingsUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingsService,
        {
          provide: GetRankingsUseCase,
          useValue: getRankingsUseCase,
        },
      ],
    }).compile();

    service = module.get(RankingsService);
  });

  it('should delegate rankings reads to GetRankingsUseCase', async () => {
    const response = {
      data: [],
      meta: {
        totalGroups: 0,
        returnedGroups: 0,
        groupsLimit: 24,
        limit: 10,
        hasMoreGroups: false,
        totalEligibleFunds: 0,
      },
    } satisfies RankingsResponse;
    getRankingsUseCase.execute.mockResolvedValue(response);

    await expect(
      service.getRankings({ benchmark: 'MSCI World' }),
    ).resolves.toBe(response);
    expect(getRankingsUseCase.execute).toHaveBeenCalledWith({
      benchmark: 'MSCI World',
    });
  });
});

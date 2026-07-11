import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FundPricesService } from '../funds/services/fund-prices.service';
import { FundsRepository } from '../funds/repositories/funds.repository';
import { RANKING_FIXTURE_FUNDS } from './entities/ranking.fixtures';
import { GetRankingsUseCase } from './get-rankings';

describe('GetRankingsUseCase', () => {
  let useCase: GetRankingsUseCase;
  let fundsRepository: { findRankingEligible: jest.Mock };
  let fundPricesService: { getHistoriesByFundIds: jest.Mock };

  beforeEach(async () => {
    fundsRepository = {
      findRankingEligible: jest.fn().mockResolvedValue(RANKING_FIXTURE_FUNDS),
    };
    fundPricesService = {
      getHistoriesByFundIds: jest.fn().mockResolvedValue(new Map()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetRankingsUseCase,
        {
          provide: FundsRepository,
          useValue: fundsRepository,
        },
        {
          provide: FundPricesService,
          useValue: fundPricesService,
        },
      ],
    }).compile();

    useCase = module.get(GetRankingsUseCase);
  });

  it('should return benchmark-scoped rankings', async () => {
    const response = await useCase.execute({});

    expect(fundsRepository.findRankingEligible).toHaveBeenCalled();
    expect(fundPricesService.getHistoriesByFundIds).toHaveBeenCalled();
    expect(response.data).toHaveLength(2);
    expect(response.meta).toMatchObject({
      totalGroups: 2,
      returnedGroups: 2,
      groupsLimit: 24,
      limit: 10,
      hasMoreGroups: false,
    });
    expect(response.data[1]?.benchmarkKey).toBe('s&p 500');
    expect(response.data[0]?.funds[0]?.returns).toEqual({
      ytd: null,
      oneYear: null,
      threeYear: null,
      asOf: null,
    });
  });

  it('should filter rankings by benchmark', async () => {
    const response = await useCase.execute({ benchmark: 'MSCI World' });

    expect(response.data).toHaveLength(1);
    expect(response.data[0]?.benchmark).toBe('MSCI World');
  });

  it('should throw when query parameters are invalid', async () => {
    await expect(useCase.execute({ limit: '0' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should throw when the benchmark filter is blank', async () => {
    await expect(useCase.execute({ benchmark: '   ' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

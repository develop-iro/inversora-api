import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FundsRepository } from '../funds/repositories/funds.repository';
import { FundPricesService } from '../funds/services/fund-prices.service';
import { RANKING_FIXTURE_FUNDS } from './entities/ranking.fixtures';
import { GetRankingsUseCase } from './get-rankings';

const ELIGIBLE_RANKING_FUNDS = RANKING_FIXTURE_FUNDS.filter(
  (fund) =>
    fund.benchmark !== null &&
    fund.score !== null &&
    fund.metrics.ter !== null &&
    fund.isin !== null,
);

describe('GetRankingsUseCase', () => {
  let useCase: GetRankingsUseCase;
  let fundsRepository: {
    findRankingFundsForQuery: jest.Mock;
    findRankingFundsAggregation: jest.Mock;
  };
  let fundPricesService: { getHistoriesByFundIds: jest.Mock };

  beforeEach(async () => {
    fundsRepository = {
      findRankingFundsForQuery: jest
        .fn()
        .mockResolvedValue(ELIGIBLE_RANKING_FUNDS),
      findRankingFundsAggregation: jest.fn().mockResolvedValue({
        groupTotals: new Map([
          ['msci world', 2],
          ['s&p 500', 2],
        ]),
        totalGroups: 2,
        totalEligibleFunds: 4,
      }),
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

  it('should return benchmark-scoped rankings from bounded SQL reads', async () => {
    const response = await useCase.execute({});

    expect(fundsRepository.findRankingFundsForQuery).toHaveBeenCalled();
    expect(fundsRepository.findRankingFundsAggregation).toHaveBeenCalled();
    expect(response.data).toHaveLength(2);
    expect(response.meta).toMatchObject({
      totalGroups: 2,
      returnedGroups: 2,
      groupsLimit: 24,
      limit: 10,
      hasMoreGroups: false,
      totalEligibleFunds: 4,
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

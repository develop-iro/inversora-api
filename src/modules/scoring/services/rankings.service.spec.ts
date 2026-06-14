import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FundsRepository } from '../../funds/repositories/funds.repository';
import { RANKING_FIXTURE_FUNDS } from '../entities/ranking.fixtures';
import { RankingsService } from './rankings.service';

describe('RankingsService', () => {
  let service: RankingsService;
  let fundsRepository: { findAll: jest.Mock };

  beforeEach(async () => {
    fundsRepository = {
      findAll: jest.fn().mockResolvedValue(RANKING_FIXTURE_FUNDS),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingsService,
        {
          provide: FundsRepository,
          useValue: fundsRepository,
        },
      ],
    }).compile();

    service = module.get(RankingsService);
  });

  it('should return benchmark-scoped rankings', async () => {
    const response = await service.getRankings({});

    expect(fundsRepository.findAll).toHaveBeenCalled();
    expect(response.data).toHaveLength(2);
    expect(response.data[1]?.benchmarkKey).toBe('s&p 500');
  });

  it('should filter rankings by benchmark', async () => {
    const response = await service.getRankings({ benchmark: 'MSCI World' });

    expect(response.data).toHaveLength(1);
    expect(response.data[0]?.benchmark).toBe('MSCI World');
  });

  it('should throw when query parameters are invalid', async () => {
    await expect(service.getRankings({ limit: '0' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should throw when the benchmark filter is blank', async () => {
    await expect(
      service.getRankings({ benchmark: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

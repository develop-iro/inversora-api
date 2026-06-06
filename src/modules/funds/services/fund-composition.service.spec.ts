import { Test, TestingModule } from '@nestjs/testing';
import { FundCompositionRepository } from '../repositories/fund-composition.repository';
import { FundCompositionService } from './fund-composition.service';

describe('FundCompositionService', () => {
  let service: FundCompositionService;
  let repository: {
    replaceSnapshot: jest.Mock;
    findSnapshot: jest.Mock;
    findLatestAsOf: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      replaceSnapshot: jest.fn().mockResolvedValue({
        holdings: 2,
        allocations: 1,
      }),
      findSnapshot: jest.fn().mockResolvedValue(null),
      findLatestAsOf: jest.fn().mockResolvedValue('2024-01-31'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundCompositionService,
        {
          provide: FundCompositionRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<FundCompositionService>(FundCompositionService);
  });

  it('should persist normalized provider holdings and allocations', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';

    await expect(
      service.saveProviderComposition(
        fundId,
        '2024-01-31',
        [
          {
            asset: 'AAPL',
            name: 'Apple Inc.',
            weightPercentage: 7.12,
          },
          {
            asset: 'MSFT',
            name: 'Microsoft Corporation',
            weightPercentage: 6.8,
          },
        ],
        [
          {
            category: 'sectorial',
            label: 'Tecnología',
            weight: 31.5,
            sortOrder: 0,
          },
        ],
      ),
    ).resolves.toEqual({
      holdings: 2,
      allocations: 1,
    });

    expect(repository.replaceSnapshot).toHaveBeenCalledWith(
      fundId,
      expect.objectContaining({
        asOf: '2024-01-31',
        holdings: expect.arrayContaining([
          expect.objectContaining({ rank: 1, asset: 'AAPL' }),
          expect.objectContaining({ rank: 2, asset: 'MSFT' }),
        ]),
        allocations: [
          {
            category: 'sectorial',
            label: 'Tecnología',
            weight: 31.5,
            sortOrder: 0,
          },
        ],
      }),
    );
  });

  it('should delegate snapshot reads to the repository', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';

    await service.getSnapshot(fundId);
    await service.getLatestAsOf(fundId);

    expect(repository.findSnapshot).toHaveBeenCalledWith(fundId, undefined);
    expect(repository.findLatestAsOf).toHaveBeenCalledWith(fundId);
  });
});

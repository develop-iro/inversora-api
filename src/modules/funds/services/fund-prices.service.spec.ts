import { Test, TestingModule } from '@nestjs/testing';
import { FundPricesRepository } from '../repositories/fund-prices.repository';
import { FundPricesService } from './fund-prices.service';

describe('FundPricesService', () => {
  let service: FundPricesService;
  let repository: {
    upsertMany: jest.Mock;
    findHistory: jest.Mock;
    findLatestDate: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      upsertMany: jest.fn().mockResolvedValue(2),
      findHistory: jest.fn().mockResolvedValue([]),
      findLatestDate: jest.fn().mockResolvedValue('2024-01-31'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundPricesService,
        {
          provide: FundPricesRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<FundPricesService>(FundPricesService);
  });

  it('should persist normalized provider prices', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';

    await expect(
      service.saveProviderPrices(fundId, [
        {
          date: '2024-01-31',
          open: 488.62,
          high: 489.08,
          low: 482.86,
          close: 482.88,
        },
        {
          date: '2024-01-30',
          open: 490.56,
          high: 491.62,
          low: 490.11,
          close: 490.89,
        },
      ]),
    ).resolves.toBe(2);

    expect(repository.upsertMany).toHaveBeenCalledWith(
      fundId,
      expect.arrayContaining([
        expect.objectContaining({ date: '2024-01-31', close: 482.88 }),
        expect.objectContaining({ date: '2024-01-30', close: 490.89 }),
      ]),
    );
  });

  it('should delegate history reads to the repository', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';

    await service.getHistory(fundId, { from: '2024-01-01' });
    await service.getLatestDate(fundId);

    expect(repository.findHistory).toHaveBeenCalledWith(fundId, {
      from: '2024-01-01',
    });
    expect(repository.findLatestDate).toHaveBeenCalledWith(fundId);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../shared/database/prisma.service';
import { parseFundPriceDate } from '../entities/fund-price.mapper';
import { FundPricesRepository } from './fund-prices.repository';

describe('FundPricesRepository', () => {
  let repository: FundPricesRepository;
  let prisma: {
    fundPrice: {
      upsert: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      fundPrice: {
        upsert: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundPricesRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<FundPricesRepository>(FundPricesRepository);
  });

  it('should upsert price rows in chunks', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';
    const prices = [
      {
        date: '2024-01-31',
        open: 488.62,
        high: 489.08,
        low: 482.86,
        close: 482.88,
        volume: null,
        change: null,
        changePercent: null,
        vwap: null,
      },
    ];

    await expect(repository.upsertMany(fundId, prices)).resolves.toBe(1);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.fundPrice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          fundId_date: {
            fundId,
            date: parseFundPriceDate('2024-01-31'),
          },
        },
      }),
    );
  });

  it('should query history ordered by date ascending', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';

    await repository.findHistory(fundId, {
      from: '2024-01-01',
      to: '2024-01-31',
    });

    expect(prisma.fundPrice.findMany).toHaveBeenCalledWith({
      where: {
        fundId,
        date: {
          gte: parseFundPriceDate('2024-01-01'),
          lte: parseFundPriceDate('2024-01-31'),
        },
      },
      orderBy: { date: 'asc' },
    });
  });
});

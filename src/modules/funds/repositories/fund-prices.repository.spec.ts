import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/client';
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
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      fundPrice: {
        upsert: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
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

  it('should return zero when upserting an empty price batch', async () => {
    await expect(
      repository.upsertMany('550e8400-e29b-41d4-a716-446655440000', []),
    ).resolves.toBe(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('should query history without date filters', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';

    await repository.findHistory(fundId);

    expect(prisma.fundPrice.findMany).toHaveBeenCalledWith({
      where: { fundId },
      orderBy: { date: 'asc' },
    });
  });

  it('should query history with only a start date', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';

    await repository.findHistory(fundId, { from: '2024-01-01' });

    expect(prisma.fundPrice.findMany).toHaveBeenCalledWith({
      where: {
        fundId,
        date: { gte: parseFundPriceDate('2024-01-01') },
      },
      orderBy: { date: 'asc' },
    });
  });

  it('should query history with only an end date', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';

    await repository.findHistory(fundId, { to: '2024-01-31' });

    expect(prisma.fundPrice.findMany).toHaveBeenCalledWith({
      where: {
        fundId,
        date: { lte: parseFundPriceDate('2024-01-31') },
      },
      orderBy: { date: 'asc' },
    });
  });

  it('should return the latest persisted price date', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';
    prisma.fundPrice.findFirst.mockResolvedValueOnce({
      date: parseFundPriceDate('2024-01-31'),
    });

    await expect(repository.findLatestDate(fundId)).resolves.toBe('2024-01-31');
  });

  it('should delete prices older than the retention cutoff', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';
    prisma.fundPrice.deleteMany.mockResolvedValueOnce({ count: 42 });

    await expect(
      repository.deleteOlderThan(fundId, '2019-01-01'),
    ).resolves.toBe(42);

    expect(prisma.fundPrice.deleteMany).toHaveBeenCalledWith({
      where: {
        fundId,
        date: {
          lt: parseFundPriceDate('2019-01-01'),
        },
      },
    });
  });

  it('should return null when no prices exist', async () => {
    await expect(
      repository.findLatestDate('550e8400-e29b-41d4-a716-446655440000'),
    ).resolves.toBeNull();
  });

  it('should return an empty map when batch history is requested for no funds', async () => {
    await expect(repository.findHistoriesByFundIds([])).resolves.toEqual(
      new Map(),
    );
    expect(prisma.fundPrice.findMany).not.toHaveBeenCalled();
  });

  it('should group batch price history by fund id', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';
    const otherFundId = '660e8400-e29b-41d4-a716-446655440001';
    prisma.fundPrice.findMany.mockResolvedValueOnce([
      {
        id: '770e8400-e29b-41d4-a716-446655440000',
        fundId,
        date: parseFundPriceDate('2024-01-02'),
        open: new Decimal('100'),
        high: new Decimal('101'),
        low: new Decimal('99'),
        close: new Decimal('100.5'),
        volume: null,
        change: null,
        changePercent: null,
        vwap: null,
        createdAt: new Date('2024-01-02T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      },
      {
        id: '880e8400-e29b-41d4-a716-446655440000',
        fundId: otherFundId,
        date: parseFundPriceDate('2024-01-03'),
        open: new Decimal('200'),
        high: new Decimal('201'),
        low: new Decimal('199'),
        close: new Decimal('200.5'),
        volume: null,
        change: null,
        changePercent: null,
        vwap: null,
        createdAt: new Date('2024-01-03T00:00:00.000Z'),
        updatedAt: new Date('2024-01-03T00:00:00.000Z'),
      },
    ]);

    const histories = await repository.findHistoriesByFundIds(
      [fundId, otherFundId],
      { from: '2024-01-01', to: '2024-01-31' },
    );

    expect(histories.get(fundId)).toHaveLength(1);
    expect(histories.get(otherFundId)?.[0]?.close).toBe(200.5);
    expect(prisma.fundPrice.findMany).toHaveBeenCalledWith({
      where: {
        fundId: { in: [fundId, otherFundId] },
        date: {
          gte: parseFundPriceDate('2024-01-01'),
          lte: parseFundPriceDate('2024-01-31'),
        },
      },
      orderBy: [{ fundId: 'asc' }, { date: 'asc' }],
    });
  });

  it('should query batch history with only a start date', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';

    await repository.findHistoriesByFundIds([fundId], { from: '2024-01-01' });

    expect(prisma.fundPrice.findMany).toHaveBeenCalledWith({
      where: {
        fundId: { in: [fundId] },
        date: { gte: parseFundPriceDate('2024-01-01') },
      },
      orderBy: [{ fundId: 'asc' }, { date: 'asc' }],
    });
  });

  it('should query batch history with only an end date', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';

    await repository.findHistoriesByFundIds([fundId], { to: '2024-01-31' });

    expect(prisma.fundPrice.findMany).toHaveBeenCalledWith({
      where: {
        fundId: { in: [fundId] },
        date: { lte: parseFundPriceDate('2024-01-31') },
      },
      orderBy: [{ fundId: 'asc' }, { date: 'asc' }],
    });
  });

  it('should query batch history without date filters', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';

    await repository.findHistoriesByFundIds([fundId]);

    expect(prisma.fundPrice.findMany).toHaveBeenCalledWith({
      where: { fundId: { in: [fundId] } },
      orderBy: [{ fundId: 'asc' }, { date: 'asc' }],
    });
  });
});

import { FundAllocationCategory as PrismaFundAllocationCategory } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../shared/database/prisma.service';
import { parseFundPriceDate } from '../entities/fund-price.mapper';
import { FundCompositionRepository } from './fund-composition.repository';

describe('FundCompositionRepository', () => {
  let repository: FundCompositionRepository;
  let prisma: {
    fundHolding: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    fundAllocation: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      fundHolding: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      fundAllocation: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn(async (callback: (tx: typeof prisma) => unknown) =>
        callback(prisma),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundCompositionRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<FundCompositionRepository>(
      FundCompositionRepository,
    );
  });

  it('should replace a composition snapshot in a transaction', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';

    await expect(
      repository.replaceSnapshot(fundId, {
        asOf: '2024-01-31',
        holdings: [
          {
            rank: 1,
            asset: 'AAPL',
            name: 'Apple Inc.',
            isin: null,
            weightPercentage: 7.12,
            marketValue: null,
            sharesNumber: null,
          },
        ],
        allocations: [
          {
            category: 'sectorial',
            label: 'Tecnología',
            weight: 31.5,
            sortOrder: 0,
          },
        ],
      }),
    ).resolves.toEqual({
      holdings: 1,
      allocations: 1,
    });

    expect(prisma.fundHolding.deleteMany).toHaveBeenCalledWith({
      where: {
        fundId,
        asOf: parseFundPriceDate('2024-01-31'),
      },
    });
    expect(prisma.fundAllocation.deleteMany).toHaveBeenCalledWith({
      where: {
        fundId,
        asOf: parseFundPriceDate('2024-01-31'),
      },
    });
    expect(prisma.fundHolding.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.fundAllocation.createMany).toHaveBeenCalledTimes(1);
  });

  it('should read country allocations for the latest snapshot', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';

    prisma.fundAllocation.findFirst.mockResolvedValueOnce({
      asOf: parseFundPriceDate('2024-01-31'),
    });
    prisma.fundAllocation.findMany.mockResolvedValueOnce([
      {
        id: '550e8400-e29b-41d4-a716-446655440020',
        fundId,
        asOf: parseFundPriceDate('2024-01-31'),
        category: PrismaFundAllocationCategory.COUNTRIES,
        label: 'Estados Unidos',
        weight: { toNumber: () => 62.4 },
        sortOrder: 0,
        createdAt: new Date('2024-02-01T00:00:00.000Z'),
        updatedAt: new Date('2024-02-01T00:00:00.000Z'),
      },
    ]);

    await expect(
      repository.findAllocationsByCategory(fundId, 'countries'),
    ).resolves.toEqual({
      asOf: '2024-01-31',
      allocations: [
        expect.objectContaining({
          category: 'countries',
          label: 'Estados Unidos',
          weight: 62.4,
        }),
      ],
    });
  });

  it('should read sector allocations for the latest snapshot', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';

    prisma.fundAllocation.findFirst.mockResolvedValueOnce({
      asOf: parseFundPriceDate('2024-01-31'),
    });
    prisma.fundAllocation.findMany.mockResolvedValueOnce([
      {
        id: '550e8400-e29b-41d4-a716-446655440030',
        fundId,
        asOf: parseFundPriceDate('2024-01-31'),
        category: PrismaFundAllocationCategory.SECTORIAL,
        label: 'Tecnología',
        weight: { toNumber: () => 31.5 },
        sortOrder: 0,
        createdAt: new Date('2024-02-01T00:00:00.000Z'),
        updatedAt: new Date('2024-02-01T00:00:00.000Z'),
      },
    ]);

    await expect(
      repository.findAllocationsByCategory(fundId, 'sectorial'),
    ).resolves.toEqual({
      asOf: '2024-01-31',
      allocations: [
        expect.objectContaining({
          category: 'sectorial',
          label: 'Tecnología',
          weight: 31.5,
        }),
      ],
    });
  });

  it('should read holdings for the latest snapshot', async () => {
    const fundId = '550e8400-e29b-41d4-a716-446655440000';

    prisma.fundHolding.findFirst.mockResolvedValueOnce({
      asOf: parseFundPriceDate('2024-01-31'),
    });
    prisma.fundHolding.findMany.mockResolvedValueOnce([
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        fundId,
        asOf: parseFundPriceDate('2024-01-31'),
        rank: 1,
        asset: 'AAPL',
        name: 'Apple Inc.',
        isin: 'US0378331005',
        weightPercentage: { toNumber: () => 7.12 },
        marketValue: null,
        sharesNumber: null,
        createdAt: new Date('2024-02-01T00:00:00.000Z'),
        updatedAt: new Date('2024-02-01T00:00:00.000Z'),
      },
    ]);

    await expect(repository.findHoldings(fundId)).resolves.toEqual({
      asOf: '2024-01-31',
      holdings: [
        expect.objectContaining({
          rank: 1,
          asset: 'AAPL',
          name: 'Apple Inc.',
        }),
      ],
    });
  });
});

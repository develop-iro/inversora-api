import { FundCategory, FundProvider } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../shared/database/prisma.service';
import { FundsRepository } from './funds.repository';

const prismaFundRow = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  symbol: 'SPY',
  isin: 'US78462F1030',
  name: 'State Street SPDR S&P 500 ETF Trust',
  provider: FundProvider.FINANCIAL_MODELING_PREP,
  category: FundCategory.INDEX,
  currency: 'USD',
  benchmark: 'S&P 500',
  volatility: null,
  drawdown: null,
  ter: new Decimal('0.0945'),
  aum: new Decimal('520000000000'),
  per: null,
  dividendYield: null,
  trackingError: null,
  riskLevel: null,
  score: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
};

describe('FundsRepository', () => {
  let repository: FundsRepository;
  let prisma: {
    fund: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      fund: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue(prismaFundRow),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (operations: unknown[]) => {
      if (Array.isArray(operations)) {
        return Promise.all(operations.map((operation) => operation));
      }

      return operations;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundsRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<FundsRepository>(FundsRepository);
  });

  it('should find a fund by symbol and provider', async () => {
    prisma.fund.findUnique.mockResolvedValueOnce(prismaFundRow);

    await expect(
      repository.findBySymbolAndProvider('spy', 'financial-modeling-prep'),
    ).resolves.toMatchObject({
      symbol: 'SPY',
      provider: 'financial-modeling-prep',
    });

    expect(prisma.fund.findUnique).toHaveBeenCalledWith({
      where: {
        symbol_provider: {
          symbol: 'SPY',
          provider: FundProvider.FINANCIAL_MODELING_PREP,
        },
      },
    });
  });

  it('should return all persisted funds ordered by symbol', async () => {
    prisma.fund.findMany.mockResolvedValueOnce([prismaFundRow]);

    await expect(repository.findAll()).resolves.toEqual([
      expect.objectContaining({
        symbol: 'SPY',
        provider: 'financial-modeling-prep',
      }),
    ]);

    expect(prisma.fund.findMany).toHaveBeenCalledWith({
      orderBy: { symbol: 'asc' },
    });
  });

  it('should query paginated funds with filters and total count', async () => {
    prisma.fund.findMany.mockResolvedValueOnce([prismaFundRow]);
    prisma.fund.count.mockResolvedValueOnce(1);

    await expect(
      repository.findMany({
        where: { currency: 'USD' },
        orderBy: { score: 'desc' },
        skip: 20,
        take: 10,
      }),
    ).resolves.toEqual({
      items: [
        expect.objectContaining({
          symbol: 'SPY',
        }),
      ],
      total: 1,
    });

    expect(prisma.fund.findMany).toHaveBeenCalledWith({
      where: { currency: 'USD' },
      orderBy: { score: 'desc' },
      skip: 20,
      take: 10,
    });
    expect(prisma.fund.count).toHaveBeenCalledWith({
      where: { currency: 'USD' },
    });
  });

  it('should find a fund by id', async () => {
    prisma.fund.findUnique.mockResolvedValueOnce(prismaFundRow);

    await expect(
      repository.findById('550e8400-e29b-41d4-a716-446655440000'),
    ).resolves.toMatchObject({
      symbol: 'SPY',
      provider: 'financial-modeling-prep',
    });

    expect(prisma.fund.findUnique).toHaveBeenCalledWith({
      where: { id: '550e8400-e29b-41d4-a716-446655440000' },
    });
  });

  it('should upsert a fund and report when a new row is created', async () => {
    await expect(
      repository.upsert({
        symbol: 'SPY',
        isin: 'US78462F1030',
        name: 'State Street SPDR S&P 500 ETF Trust',
        provider: 'financial-modeling-prep',
        category: 'index',
        currency: 'USD',
        benchmark: 'S&P 500',
        metrics: {
          ter: 0.0945,
          aum: 520_000_000_000,
        },
      }),
    ).resolves.toEqual({
      created: true,
      fund: expect.objectContaining({
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
      }),
    });

    expect(prisma.fund.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          symbol_provider: {
            symbol: 'SPY',
            provider: FundProvider.FINANCIAL_MODELING_PREP,
          },
        },
      }),
    );
  });

  it('should report created=false when the fund already exists', async () => {
    prisma.fund.findUnique.mockResolvedValueOnce(prismaFundRow);

    await expect(
      repository.upsert({
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        provider: 'financial-modeling-prep',
        category: 'index',
        currency: 'USD',
      }),
    ).resolves.toMatchObject({
      created: false,
    });
  });
});

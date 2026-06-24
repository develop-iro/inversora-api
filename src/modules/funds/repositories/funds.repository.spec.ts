import {
  CatalogVisibility,
  FundCategory,
  FundProvider,
  FundVehicleType,
} from '@prisma/client';
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
  vehicle: FundVehicleType.ETF,
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
  catalogVisibility: CatalogVisibility.VISIBLE,
  badge: '',
  themeLabel: '',
  idealForBeginners: false,
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
      update: jest.Mock;
      count: jest.Mock;
    };
    fundCatalogVisibilityAudit: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      fund: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue(prismaFundRow),
        update: jest.fn().mockResolvedValue({
          ...prismaFundRow,
          score: new Decimal('87.00'),
        }),
        count: jest.fn().mockResolvedValue(0),
      },
      fundCatalogVisibilityAudit: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
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

  it('should find a fund by ISIN', async () => {
    prisma.fund.findUnique.mockResolvedValueOnce(prismaFundRow);

    await expect(repository.findByIsin('us78462f1030')).resolves.toMatchObject({
      isin: 'US78462F1030',
    });

    expect(prisma.fund.findUnique).toHaveBeenCalledWith({
      where: { isin: 'US78462F1030' },
    });
  });

  it('should return null when ISIN is not found', async () => {
    prisma.fund.findUnique.mockResolvedValueOnce(null);

    await expect(repository.findByIsin('IE00B4L5Y983')).resolves.toBeNull();
  });

  it('should find funds by a list of ISINs', async () => {
    prisma.fund.findMany.mockResolvedValueOnce([prismaFundRow]);

    await expect(
      repository.findByIsins(['us78462f1030', 'US78462F1030']),
    ).resolves.toEqual(
      new Map([
        [
          'US78462F1030',
          expect.objectContaining({
            isin: 'US78462F1030',
          }),
        ],
      ]),
    );

    expect(prisma.fund.findMany).toHaveBeenCalledWith({
      where: {
        isin: {
          in: ['US78462F1030'],
        },
      },
    });
  });

  it('should return an empty map when no ISINs are provided', async () => {
    await expect(repository.findByIsins([])).resolves.toEqual(new Map());
    expect(prisma.fund.findMany).not.toHaveBeenCalled();
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

  it('should return null when a fund id is not found', async () => {
    prisma.fund.findUnique.mockResolvedValueOnce(null);

    await expect(
      repository.findById('00000000-0000-0000-0000-000000000000'),
    ).resolves.toBeNull();
  });

  it('should upsert a fund and report when a new row is created', async () => {
    const result = await repository.upsert({
      symbol: 'SPY',
      isin: 'US78462F1030',
      name: 'State Street SPDR S&P 500 ETF Trust',
      provider: 'financial-modeling-prep',
      category: 'index',
      vehicle: 'etf',
      currency: 'USD',
      benchmark: 'S&P 500',
      metrics: {
        ter: 0.0945,
        aum: 520_000_000_000,
      },
    });

    expect(result.created).toBe(true);
    expect(result.fund).toMatchObject({
      symbol: 'SPY',
      name: 'State Street SPDR S&P 500 ETF Trust',
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

  it('should persist a computed score for a fund', async () => {
    await expect(
      repository.updateScore('550e8400-e29b-41d4-a716-446655440000', 87),
    ).resolves.toMatchObject({
      id: '550e8400-e29b-41d4-a716-446655440000',
      score: 87,
    });

    expect(prisma.fund.update).toHaveBeenCalledWith({
      where: { id: '550e8400-e29b-41d4-a716-446655440000' },
      data: { score: 87 },
    });
  });

  it('should report created=false when the fund already exists', async () => {
    prisma.fund.findUnique.mockResolvedValueOnce(prismaFundRow);

    await expect(
      repository.upsert({
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        provider: 'financial-modeling-prep',
        category: 'index',
        vehicle: 'etf',
        currency: 'USD',
      }),
    ).resolves.toMatchObject({
      created: false,
    });
  });

  it('should update catalog visibility and append an audit row', async () => {
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback({
          fund: {
            findUnique: jest.fn().mockResolvedValue(prismaFundRow),
            update: jest.fn().mockResolvedValue({
              ...prismaFundRow,
              catalogVisibility: CatalogVisibility.QUARANTINED,
            }),
          },
          fundCatalogVisibilityAudit: {
            create: jest.fn().mockResolvedValue({}),
          },
        } as never),
    );

    await expect(
      repository.updateCatalogVisibility({
        fundId: prismaFundRow.id,
        catalogVisibility: 'quarantined',
        reason: 'Missing score',
        actor: 'system',
      }),
    ).resolves.toMatchObject({
      catalogVisibility: 'quarantined',
    });
  });

  it('should fail catalog visibility updates when the fund does not exist', async () => {
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback({
          fund: {
            findUnique: jest.fn().mockResolvedValue(null),
            update: jest.fn(),
          },
          fundCatalogVisibilityAudit: {
            create: jest.fn(),
          },
        } as never),
    );

    await expect(
      repository.updateCatalogVisibility({
        fundId: prismaFundRow.id,
        catalogVisibility: 'quarantined',
        reason: 'Missing score',
        actor: 'system',
      }),
    ).rejects.toThrow(`Fund ${prismaFundRow.id} was not found`);
  });

  it('should return catalog visibility audit rows', async () => {
    prisma.fundCatalogVisibilityAudit.findMany.mockResolvedValueOnce([
      {
        id: 'audit-1',
        fundId: prismaFundRow.id,
        previousState: CatalogVisibility.VISIBLE,
        newState: CatalogVisibility.QUARANTINED,
        reason: 'Missing score',
        actor: 'system',
        createdAt: new Date('2024-03-01T00:00:00.000Z'),
      },
    ]);

    await expect(
      repository.findCatalogVisibilityAudits(prismaFundRow.id),
    ).resolves.toEqual([
      {
        id: 'audit-1',
        fundId: prismaFundRow.id,
        previousState: 'visible',
        newState: 'quarantined',
        reason: 'Missing score',
        actor: 'system',
        createdAt: new Date('2024-03-01T00:00:00.000Z'),
      },
    ]);
  });

  it('should update editorial fields', async () => {
    prisma.fund.update.mockResolvedValueOnce({
      ...prismaFundRow,
      badge: 'Ideal para empezar',
      themeLabel: 'Multisector global',
      idealForBeginners: true,
    });

    await expect(
      repository.updateEditorial(prismaFundRow.id, {
        badge: 'Ideal para empezar',
        themeLabel: 'Multisector global',
        idealForBeginners: true,
      }),
    ).resolves.toMatchObject({
      editorial: {
        badge: 'Ideal para empezar',
        themeLabel: 'Multisector global',
        idealForBeginners: true,
      },
    });
  });
});

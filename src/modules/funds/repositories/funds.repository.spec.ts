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
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      fund: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue(prismaFundRow),
      },
    };

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

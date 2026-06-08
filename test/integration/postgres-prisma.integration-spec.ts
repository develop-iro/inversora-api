import type { TestingModule } from '@nestjs/testing';
import { FundsRepository } from '../../src/modules/funds/repositories/funds.repository';
import { PrismaService } from '../../src/shared/database/prisma.service';
import {
  createFundsIntegrationModule,
  deleteFundBySymbol,
  INTEGRATION_FUND_SYMBOL,
  isDatabaseAvailable,
} from './integration-test.utils';

describe('PostgreSQL and Prisma (integration)', () => {
  let moduleRef: TestingModule | undefined;
  let prisma: PrismaService;
  let fundsRepository: FundsRepository;
  let skipSuite = false;

  beforeAll(async () => {
    skipSuite = !(await isDatabaseAvailable());

    if (skipSuite) {
      console.warn(
        'PostgreSQL is not available. Skipping PostgreSQL and Prisma integration tests.',
      );
      return;
    }

    moduleRef = await createFundsIntegrationModule();
    prisma = moduleRef.get(PrismaService);
    fundsRepository = moduleRef.get(FundsRepository);
    await prisma.onModuleInit();
  });

  afterAll(async () => {
    if (skipSuite || moduleRef === undefined) {
      return;
    }

    await prisma.onModuleDestroy();
    await moduleRef.close();
  });

  beforeEach(async () => {
    if (skipSuite) {
      return;
    }

    await deleteFundBySymbol(prisma, INTEGRATION_FUND_SYMBOL);
  });

  it('should connect to PostgreSQL through Prisma', async () => {
    if (skipSuite) {
      return;
    }

    const result = await prisma.$queryRaw<Array<{ result: number }>>`SELECT 1 AS result`;

    expect(result[0]?.result).toBe(1);
  });

  it('should persist and read a fund through the repository layer', async () => {
    if (skipSuite) {
      return;
    }

    const { fund, created } = await fundsRepository.upsert({
      symbol: INTEGRATION_FUND_SYMBOL,
      isin: 'US78462F1030',
      name: 'State Street SPDR S&P 500 ETF Trust',
      provider: 'financial-modeling-prep',
      category: 'index',
      currency: 'USD',
      benchmark: null,
      metrics: {
        volatility: null,
        drawdown: null,
        ter: 0.0945,
        aum: 520_000_000_000,
        per: null,
        dividendYield: null,
        trackingError: null,
      },
      riskLevel: null,
      score: null,
    });

    expect(created).toBe(true);
    expect(fund.symbol).toBe(INTEGRATION_FUND_SYMBOL);

    const persisted = await fundsRepository.findBySymbolAndProvider(
      INTEGRATION_FUND_SYMBOL,
      'financial-modeling-prep',
    );

    expect(persisted).not.toBeNull();
    expect(persisted?.id).toBe(fund.id);
    expect(persisted?.name).toBe(fund.name);
  });
});

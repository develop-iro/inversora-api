import type { TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FundCompositionSyncService } from '../../src/modules/funds/services/fund-composition-sync.service';
import { FundSyncService } from '../../src/modules/funds/services/fund-sync.service';
import { FeaturedFundsService } from '../../src/modules/bff/services/featured-funds.service';
import { featuredFundsResponseSchema } from '../../src/modules/bff/entities/featured-funds.schema';
import { PrismaService } from '../../src/shared/database/prisma.service';
import {
  createFundsIntegrationModule,
  deleteFundBySymbol,
  INTEGRATION_FUND_SYMBOL,
  isDatabaseAvailable,
} from './integration-test.utils';

describe('Featured funds BFF (integration)', () => {
  let moduleRef: TestingModule | undefined;
  let prisma: PrismaService;
  let fundSyncService: FundSyncService;
  let fundCompositionSyncService: FundCompositionSyncService;
  let featuredFundsService: FeaturedFundsService;
  let skipSuite = false;
  let syncedIsin = 'US78462F1030';

  beforeAll(async () => {
    skipSuite = !(await isDatabaseAvailable());

    if (skipSuite) {
      console.warn(
        'PostgreSQL is not available. Skipping featured funds integration tests.',
      );
      return;
    }

    moduleRef = await createFundsIntegrationModule();
    prisma = moduleRef.get(PrismaService);
    fundSyncService = moduleRef.get(FundSyncService);
    fundCompositionSyncService = moduleRef.get(FundCompositionSyncService);
    featuredFundsService = moduleRef.get(FeaturedFundsService);
    await prisma.onModuleInit();
  });

  afterAll(async () => {
    if (skipSuite || moduleRef === undefined) {
      return;
    }

    await deleteFundBySymbol(prisma, INTEGRATION_FUND_SYMBOL);
    await prisma.onModuleDestroy();
    await moduleRef.close();
  });

  beforeEach(async () => {
    if (skipSuite) {
      return;
    }

    await deleteFundBySymbol(prisma, INTEGRATION_FUND_SYMBOL);

    const syncResult = await fundSyncService.syncFromFmp(
      INTEGRATION_FUND_SYMBOL,
      {
        includePrices: true,
        historyFrom: '2024-01-01',
        historyTo: '2024-03-31',
        incrementalPrices: false,
      },
    );

    await fundCompositionSyncService.syncFromFmp(INTEGRATION_FUND_SYMBOL);
    syncedIsin = syncResult.fund.isin ?? syncedIsin;
  });

  it('should return 400 for an invalid quarter format', async () => {
    if (skipSuite) {
      return;
    }

    await expect(
      featuredFundsService.getFeaturedFunds({ quarter: 'bad-quarter' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should return an empty array for unconfigured quarters', async () => {
    if (skipSuite) {
      return;
    }

    const response = await featuredFundsService.getFeaturedFunds({
      quarter: '1999-Q1',
    });

    expect(response.data).toEqual([]);
    expect(response.quarter).toBe('1999-Q1');
  });

  it('should return hydrated featured funds for a configured quarter', async () => {
    if (skipSuite) {
      return;
    }

    const response = await featuredFundsService.getFeaturedFunds({
      quarter: '2026-Q2',
    });
    const parsed = featuredFundsResponseSchema.parse(response);

    expect(parsed.quarter).toBe('2026-Q2');
    expect(parsed.data.some((fund) => fund.isin === syncedIsin)).toBe(true);
    expect(parsed.data.every((fund) => fund.isFeatured)).toBe(true);
  });

  it('should apply mercado filters without failing', async () => {
    if (skipSuite) {
      return;
    }

    const response = await featuredFundsService.getFeaturedFunds({
      quarter: '2026-Q2',
      mercado: 'usa',
    });

    expect(response.data.length).toBeGreaterThan(0);
    expect(
      response.data.every((fund) => {
        const category = fund.categoryLabel.toLowerCase();
        const theme = fund.themeLabel.toLowerCase();
        const name = fund.name.toLowerCase();

        return (
          category.includes('usa') ||
          theme.includes('usa') ||
          category.includes('s&p') ||
          theme.includes('s&p') ||
          name.includes('s&p')
        );
      }),
    ).toBe(true);
  });
});

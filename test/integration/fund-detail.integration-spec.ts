import type { TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FundDetailService } from '../../src/modules/bff/services/fund-detail.service';
import { fundDetailResponseSchema } from '../../src/modules/bff/entities/fund-detail.schema';
import { PrismaService } from '../../src/shared/database/prisma.service';
import {
  createFundsIntegrationModule,
  deleteFundBySymbol,
  INTEGRATION_FUND_SYMBOL,
  isDatabaseAvailable,
  syncAndPublishIntegrationFund,
} from './integration-test.utils';

describe('Fund detail BFF (integration)', () => {
  let moduleRef: TestingModule | undefined;
  let prisma: PrismaService;
  let fundDetailService: FundDetailService;
  let skipSuite = false;
  let syncedIsin = 'US78462F1030';

  beforeAll(async () => {
    skipSuite = !(await isDatabaseAvailable());

    if (skipSuite) {
      console.warn(
        'PostgreSQL is not available. Skipping fund detail integration tests.',
      );
      return;
    }

    moduleRef = await createFundsIntegrationModule();
    prisma = moduleRef.get(PrismaService);
    fundDetailService = moduleRef.get(FundDetailService);
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

    const publishedFund = await syncAndPublishIntegrationFund(
      moduleRef!,
      INTEGRATION_FUND_SYMBOL,
      {
        includePrices: true,
        historyFrom: '2024-01-01',
        historyTo: '2024-03-31',
        incrementalPrices: false,
        composition: true,
      },
    );
    syncedIsin = publishedFund.isin ?? syncedIsin;
  });

  it('should return 400 for an invalid ISIN format', async () => {
    if (skipSuite) {
      return;
    }

    await expect(
      fundDetailService.getFundDetailByIsin('INVALID'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should return 404 for an unknown ISIN', async () => {
    if (skipSuite) {
      return;
    }

    await expect(
      fundDetailService.getFundDetailByIsin('IE00TEST1234'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should return an aggregated FundDetail payload for a synced fund', async () => {
    if (skipSuite) {
      return;
    }

    const response = await fundDetailService.getFundDetailByIsin(syncedIsin);
    const parsed = fundDetailResponseSchema.parse(response);

    expect(parsed.fund.isin).toBe(syncedIsin);
    expect(parsed.inversoraScore).toBeGreaterThanOrEqual(0);
    expect(parsed.scoredBreakdown).toHaveLength(6);
    expect(parsed.market.performanceByTimeframe['1y']).toBeDefined();
    expect(
      parsed.profile.exposureByTab.sectorial.length,
    ).toBeGreaterThanOrEqual(0);
    expect(parsed.profile.exposureByTab.portfolio.length).toBeGreaterThan(0);
  });

  it('should keep empty sections when optional composition data is missing', async () => {
    if (skipSuite) {
      return;
    }

    await prisma.fundAllocation.deleteMany();

    const response = await fundDetailService.getFundDetailByIsin(syncedIsin);

    expect(response.profile.exposureByTab.sectorial).toEqual([]);
    expect(response.profile.exposureByTab.regional).toEqual([]);
    expect(response.market.regions).toEqual([]);
  });
});

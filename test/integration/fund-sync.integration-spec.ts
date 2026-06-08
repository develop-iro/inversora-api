import type { TestingModule } from '@nestjs/testing';
import { FundPriceSyncService } from '../../src/modules/funds/services/fund-price-sync.service';
import { FundSyncService } from '../../src/modules/funds/services/fund-sync.service';
import { FundsRepository } from '../../src/modules/funds/repositories/funds.repository';
import { PrismaService } from '../../src/shared/database/prisma.service';
import {
  createFundsIntegrationModule,
  deleteFundBySymbol,
  INTEGRATION_FUND_SYMBOL,
  isDatabaseAvailable,
} from './integration-test.utils';

describe('Fund sync pipeline (integration)', () => {
  let moduleRef: TestingModule | undefined;
  let prisma: PrismaService;
  let fundSyncService: FundSyncService;
  let fundPriceSyncService: FundPriceSyncService;
  let fundsRepository: FundsRepository;
  let skipSuite = false;

  beforeAll(async () => {
    skipSuite = !(await isDatabaseAvailable());

    if (skipSuite) {
      console.warn(
        'PostgreSQL is not available. Skipping fund sync integration tests.',
      );
      return;
    }

    moduleRef = await createFundsIntegrationModule();
    prisma = moduleRef.get(PrismaService);
    fundSyncService = moduleRef.get(FundSyncService);
    fundPriceSyncService = moduleRef.get(FundPriceSyncService);
    fundsRepository = moduleRef.get(FundsRepository);
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
  });

  it('should sync fund metadata from FMP fixtures into PostgreSQL', async () => {
    if (skipSuite) {
      return;
    }

    const result = await fundSyncService.syncFromFmp(INTEGRATION_FUND_SYMBOL);

    expect(result.created).toBe(true);
    expect(result.fund.symbol).toBe(INTEGRATION_FUND_SYMBOL);
    expect(result.fund.provider).toBe('financial-modeling-prep');
    expect(result.fund.isin).toBe('US78462F1030');

    const persisted = await fundsRepository.findBySymbolAndProvider(
      INTEGRATION_FUND_SYMBOL,
      'financial-modeling-prep',
    );

    expect(persisted?.id).toBe(result.fund.id);
  });

  it('should sync fund metadata and historical prices end to end', async () => {
    if (skipSuite) {
      return;
    }

    const result = await fundSyncService.syncFromFmp(INTEGRATION_FUND_SYMBOL, {
      includePrices: true,
      historyFrom: '2024-01-01',
      historyTo: '2024-01-31',
      incrementalPrices: false,
    });

    expect(result.created).toBe(true);
    expect(result.pricesSynced).toBeGreaterThan(0);

    const priceCount = await prisma.fundPrice.count({
      where: {
        fundId: result.fund.id,
      },
    });

    expect(priceCount).toBe(result.pricesSynced);
  });

  it('should treat an incremental price sync as up to date when data already exists', async () => {
    if (skipSuite) {
      return;
    }

    await fundSyncService.syncFromFmp(INTEGRATION_FUND_SYMBOL, {
      includePrices: true,
      historyFrom: '2024-01-01',
      historyTo: '2024-01-31',
      incrementalPrices: false,
    });

    const secondSync = await fundPriceSyncService.syncFromFmp(
      INTEGRATION_FUND_SYMBOL,
      {
        incremental: true,
      },
    );

    expect(secondSync.upToDate).toBe(true);
    expect(secondSync.pricesSynced).toBe(0);
  });
});

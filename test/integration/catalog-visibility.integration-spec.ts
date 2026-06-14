import { NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { CatalogVisibility, FundCategory, FundProvider } from '@prisma/client';
import { FundsService } from '../../src/modules/funds/services/funds.service';
import { CatalogVisibilityService } from '../../src/modules/funds/services/catalog-visibility.service';
import { buildFundListWhereInput } from '../../src/modules/funds/entities/fund-list.mapper';
import { FundsRepository } from '../../src/modules/funds/repositories/funds.repository';
import { PrismaService } from '../../src/shared/database/prisma.service';
import {
  createFundsIntegrationModule,
  deleteFundBySymbol,
  isDatabaseAvailable,
} from './integration-test.utils';

const visibilityQaFundData = {
  symbol: 'VISQA',
  isin: 'IE00B4L5Y983',
  name: 'Visibility QA Fund',
  provider: FundProvider.FINANCIAL_MODELING_PREP,
  category: FundCategory.INDEX,
  currency: 'EUR',
  benchmark: 'MSCI World',
  ter: 0.2,
  score: 75,
  catalogVisibility: CatalogVisibility.QUARANTINED,
} as const;

describe('Catalog visibility (integration)', () => {
  let moduleRef: TestingModule | undefined;
  let prisma: PrismaService;
  let fundsService: FundsService;
  let catalogVisibilityService: CatalogVisibilityService;
  let fundsRepository: FundsRepository;
  let skipSuite = false;

  beforeAll(async () => {
    skipSuite = !(await isDatabaseAvailable());

    if (skipSuite) {
      console.warn(
        'PostgreSQL is not available. Skipping catalog visibility integration tests.',
      );
      return;
    }

    moduleRef = await createFundsIntegrationModule();
    prisma = moduleRef.get(PrismaService);
    fundsService = moduleRef.get(FundsService);
    catalogVisibilityService = moduleRef.get(CatalogVisibilityService);
    fundsRepository = moduleRef.get(FundsRepository);
    await prisma.onModuleInit();
  });

  afterAll(async () => {
    if (skipSuite || moduleRef === undefined) {
      return;
    }

    await deleteFundBySymbol(prisma, 'VISQA');
    await prisma.onModuleDestroy();
    await moduleRef.close();
  });

  beforeEach(async () => {
    if (skipSuite) {
      return;
    }

    await deleteFundBySymbol(prisma, 'VISQA');
  });

  it('should exclude quarantined funds from public listings and allow admin retrieval', async () => {
    if (skipSuite) {
      return;
    }

    const created = await prisma.fund.create({
      data: visibilityQaFundData,
    });

    const publicList = await fundsService.listFunds({ q: 'VISQA' });
    expect(publicList.data).toEqual([]);

    await expect(fundsService.getFundById(created.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    const adminList = await fundsRepository.findMany({
      where: buildFundListWhereInput(
        { q: 'VISQA' },
        { catalogVisibility: ['quarantined'] },
      ),
      orderBy: { symbol: 'asc' },
      skip: 0,
      take: 20,
    });

    expect(adminList.items).toEqual([
      expect.objectContaining({
        id: created.id,
        catalogVisibility: 'quarantined',
      }),
    ]);
  });

  it('should persist manual visibility changes with audit history', async () => {
    if (skipSuite) {
      return;
    }

    const created = await prisma.fund.create({
      data: visibilityQaFundData,
    });

    const updated = await catalogVisibilityService.updateCatalogVisibility({
      fundId: created.id,
      catalogVisibility: 'visible',
      reason: 'Reviewed for public catalog',
      actor: 'integration-test',
    });

    expect(updated.catalogVisibility).toBe('visible');

    const audits = await catalogVisibilityService.listVisibilityAudits(
      created.id,
    );

    expect(audits[0]).toMatchObject({
      previousState: 'quarantined',
      newState: 'visible',
      reason: 'Reviewed for public catalog',
      actor: 'integration-test',
    });

    const publicFund = await fundsService.getFundById(created.id);
    expect(publicFund.catalogVisibility).toBe('visible');
  });
});

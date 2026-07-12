import { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { fundDetailResponseSchema } from '../src/core/api/schemas/fund-detail.schema';
import { fundListResponseSchema } from '../src/core/api/schemas/fund-list.schema';
import { rankingsResponseSchema } from '../src/core/api/schemas/rankings.schema';
import { fundChartResponseSchema } from '../src/modules/funds/entities/fund-chart.schema';
import { fundCountryExposureResponseSchema } from '../src/modules/funds/entities/fund-country-exposure.schema';
import { fundHoldingsResponseSchema } from '../src/modules/funds/entities/fund-holdings.schema';
import { fundSectorExposureResponseSchema } from '../src/modules/funds/entities/fund-sector-exposure.schema';
import { PrismaService } from '../src/shared/database/prisma.service';
import {
  createFundsIntegrationModule,
  deleteFundBySymbol,
  INTEGRATION_FUND_SYMBOL,
  isDatabaseAvailable,
  syncAndPublishIntegrationFund,
} from './integration/integration-test.utils';

describe('Critical app HTTP flows (e2e)', () => {
  let app: INestApplication<App> | undefined;
  let moduleRef: TestingModule | undefined;
  let prisma: PrismaService;
  let skipSuite = false;
  let fundId = '';
  let fundIsin = 'US78462F1030';

  beforeAll(async () => {
    skipSuite = !(await isDatabaseAvailable());

    if (skipSuite) {
      console.warn(
        'PostgreSQL is not available. Skipping critical HTTP e2e tests.',
      );
      return;
    }

    moduleRef = await createFundsIntegrationModule();
    prisma = moduleRef.get(PrismaService);
    app = moduleRef.createNestApplication();
    await app.init();

    await deleteFundBySymbol(prisma, INTEGRATION_FUND_SYMBOL);

    const publishedFund = await syncAndPublishIntegrationFund(
      moduleRef,
      INTEGRATION_FUND_SYMBOL,
      {
        includePrices: true,
        historyFrom: '2024-01-01',
        historyTo: '2024-03-31',
        incrementalPrices: false,
        composition: true,
      },
    );

    fundId = publishedFund.id;
    fundIsin = publishedFund.isin ?? fundIsin;
  });

  afterAll(async () => {
    if (skipSuite || app === undefined) {
      return;
    }

    await deleteFundBySymbol(prisma, INTEGRATION_FUND_SYMBOL);
    await app.close();
  });

  it('GET /funds should expose the published catalog item with pagination metadata', async () => {
    if (skipSuite || app === undefined) {
      return;
    }

    const response = await request(app.getHttpServer())
      .get('/funds')
      .query({ q: INTEGRATION_FUND_SYMBOL, limit: 10 })
      .expect(200);
    const parsed = fundListResponseSchema.parse(response.body);

    expect(parsed.meta.total).toBeGreaterThanOrEqual(1);
    expect(parsed.data).toContainEqual(
      expect.objectContaining({
        id: fundId,
        symbol: INTEGRATION_FUND_SYMBOL,
        isin: fundIsin,
        catalogVisibility: 'visible',
      }),
    );
  });

  it('GET /funds/:isin should return the mobile fund detail contract', async () => {
    if (skipSuite || app === undefined) {
      return;
    }

    const response = await request(app.getHttpServer())
      .get(`/funds/${fundIsin}`)
      .expect(200);
    const parsed = fundDetailResponseSchema.parse(response.body);

    expect(parsed.fund.id).toBe(fundId);
    expect(parsed.fund.isin).toBe(fundIsin);
    expect(parsed.inversoraScore).toBeGreaterThanOrEqual(0);
    expect(parsed.scoredBreakdown).toHaveLength(6);
    expect(parsed.market.performanceByTimeframe['1y'].points.length).toBe(3);
    expect(parsed.profile.exposureByTab.portfolio.length).toBeGreaterThan(0);
  });

  it('GET /rankings should rank the published fund inside its benchmark group', async () => {
    if (skipSuite || app === undefined) {
      return;
    }

    const response = await request(app.getHttpServer())
      .get('/rankings')
      .query({ benchmark: 'S&P 500', limit: 10 })
      .expect(200);
    const parsed = rankingsResponseSchema.parse(response.body);
    const rankedFunds = parsed.data.flatMap((group) => group.funds);

    expect(parsed.meta.totalEligibleFunds).toBeGreaterThanOrEqual(1);
    expect(rankedFunds).toContainEqual(
      expect.objectContaining({
        id: fundId,
        isin: fundIsin,
        symbol: INTEGRATION_FUND_SYMBOL,
        rank: 1,
      }),
    );
  });

  it('GET /funds/:id composition endpoints should expose holdings and allocations', async () => {
    if (skipSuite || app === undefined) {
      return;
    }

    const [holdingsResponse, sectorsResponse, countriesResponse] =
      await Promise.all([
        request(app.getHttpServer()).get(`/funds/${fundId}/holdings`),
        request(app.getHttpServer()).get(`/funds/${fundId}/exposure/sectors`),
        request(app.getHttpServer()).get(`/funds/${fundId}/exposure/countries`),
      ]);

    expect(holdingsResponse.status).toBe(200);
    expect(sectorsResponse.status).toBe(200);
    expect(countriesResponse.status).toBe(200);

    const holdings = fundHoldingsResponseSchema.parse(holdingsResponse.body);
    const sectors = fundSectorExposureResponseSchema.parse(
      sectorsResponse.body,
    );
    const countries = fundCountryExposureResponseSchema.parse(
      countriesResponse.body,
    );

    expect(holdings.fundId).toBe(fundId);
    expect(holdings.asOf).toBe('2024-01-31');
    expect(holdings.holdings.length).toBeGreaterThan(0);
    expect(sectors.sectors.length).toBeGreaterThan(0);
    expect(countries.countries.length).toBeGreaterThan(0);
  });

  it('GET /funds/:id/chart should expose indexed historical performance', async () => {
    if (skipSuite || app === undefined) {
      return;
    }

    const response = await request(app.getHttpServer())
      .get(`/funds/${fundId}/chart`)
      .query({ period: '1Y' })
      .expect(200);
    const parsed = fundChartResponseSchema.parse(response.body);

    expect(parsed.fundId).toBe(fundId);
    expect(parsed.period).toBe('1Y');
    expect(parsed.points.length).toBe(3);
    expect(parsed.points[0]?.value).toBe(100);
  });

  it('should reject invalid query and identifier inputs with 400', async () => {
    if (skipSuite || app === undefined) {
      return;
    }

    await request(app.getHttpServer())
      .get('/funds')
      .query({ limit: 0 })
      .expect(400);

    await request(app.getHttpServer())
      .get('/rankings')
      .query({ limit: 101 })
      .expect(400);

    await request(app.getHttpServer()).get('/funds/INVALIDISIN').expect(400);
  });
});

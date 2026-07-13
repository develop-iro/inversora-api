import {
  CatalogVisibility as PrismaCatalogVisibility,
  FundCategory as PrismaFundCategory,
  FundProvider as PrismaFundProvider,
  FundVehicleType as PrismaFundVehicleType,
  type Prisma,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { rankingsQuerySchema } from '../../../core/api/schemas/rankings.schema';
import { PRISMA_FUND_MATERIALIZED_FIELD_DEFAULTS } from '../test-utils/prisma-fund.fixtures';
import {
  countRankingEligibleFunds,
  queryRankingFundsAggregation,
  queryRankingFundsForQuery,
  queryRankingGroupTotals,
} from './ranking-funds.query';

type QueryRaw = <T>(query: Prisma.Sql) => Promise<T>;

const rankingPrismaFundRow = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  symbol: 'IWDA',
  isin: 'IE00B4L5Y983',
  name: 'iShares Core MSCI World UCITS ETF',
  provider: PrismaFundProvider.FINANCIAL_MODELING_PREP,
  category: PrismaFundCategory.INDEX,
  vehicle: PrismaFundVehicleType.ETF,
  currency: 'USD',
  benchmark: 'MSCI World',
  assetClass: 'Equity',
  domicile: 'IE',
  investmentTheme: null,
  issuer: null,
  volatility: null,
  drawdown: null,
  ter: new Decimal('0.2000'),
  aum: new Decimal('50000000000.00'),
  per: null,
  dividendYield: null,
  trackingError: null,
  riskLevel: 4,
  score: new Decimal('88.50'),
  catalogVisibility: PrismaCatalogVisibility.VISIBLE,
  badge: '',
  themeLabel: '',
  idealForBeginners: true,
  ...PRISMA_FUND_MATERIALIZED_FIELD_DEFAULTS,
  peerGroupKey: 'msci world',
  peerRank: 1,
  return1y: new Decimal('12.50'),
  return3y: new Decimal('28.00'),
  returnYtd: new Decimal('5.00'),
  returnAsOf: new Date('2024-06-01T00:00:00.000Z'),
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
};

describe('ranking-funds.query', () => {
  let queryRaw: jest.MockedFunction<QueryRaw>;

  beforeEach(() => {
    queryRaw = jest.fn() as jest.MockedFunction<QueryRaw>;
  });

  describe('queryRankingFundsForQuery', () => {
    it('should load ranked funds without a benchmark filter', async () => {
      queryRaw.mockResolvedValueOnce([rankingPrismaFundRow]);
      const query = rankingsQuerySchema.parse({});

      const funds = await queryRankingFundsForQuery(
        { $queryRaw: queryRaw },
        query,
      );

      expect(queryRaw).toHaveBeenCalledTimes(1);
      const sql = queryRaw.mock.calls[0]?.[0] as { strings: readonly string[] };
      expect(sql.strings.join('')).toContain(
        `"catalogVisibility" != 'blocked'`,
      );
      expect(funds).toHaveLength(1);
      expect(funds[0]?.isin).toBe('IE00B4L5Y983');
      expect(funds[0]?.materialized.peerGroupKey).toBe('msci world');
    });

    it('should normalize benchmark filters for peer-group SQL', async () => {
      queryRaw.mockResolvedValueOnce([rankingPrismaFundRow]);
      const query = rankingsQuerySchema.parse({
        benchmark: '  MSCI World ',
        limit: 5,
        groupsLimit: 12,
      });

      const funds = await queryRankingFundsForQuery(
        { $queryRaw: queryRaw },
        query,
      );

      expect(funds).toHaveLength(1);
      expect(queryRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('queryRankingGroupTotals', () => {
    it('should map peer-group totals into a map', async () => {
      queryRaw.mockResolvedValueOnce([
        { peerGroupKey: 'msci world', total: 3 },
        { peerGroupKey: 's&p 500', total: 2 },
      ]);

      const totals = await queryRankingGroupTotals(
        { $queryRaw: queryRaw },
        null,
      );

      expect(totals.get('msci world')).toBe(3);
      expect(totals.get('s&p 500')).toBe(2);
    });

    it('should apply benchmark filters when counting groups', async () => {
      queryRaw.mockResolvedValueOnce([
        { peerGroupKey: 'msci world', total: 1 },
      ]);

      const totals = await queryRankingGroupTotals(
        { $queryRaw: queryRaw },
        'msci world',
      );

      expect(totals.size).toBe(1);
      expect(queryRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('countRankingEligibleFunds', () => {
    it('should return the eligible fund count', async () => {
      queryRaw.mockResolvedValueOnce([{ total: 42 }]);

      await expect(
        countRankingEligibleFunds({ $queryRaw: queryRaw }, null),
      ).resolves.toBe(42);
    });

    it('should return zero when the count query is empty', async () => {
      queryRaw.mockResolvedValueOnce([]);

      await expect(
        countRankingEligibleFunds({ $queryRaw: queryRaw }, 'msci world'),
      ).resolves.toBe(0);
    });
  });

  describe('queryRankingFundsAggregation', () => {
    it('should combine group totals and eligible fund counts', async () => {
      queryRaw
        .mockResolvedValueOnce([{ peerGroupKey: 'msci world', total: 2 }])
        .mockResolvedValueOnce([{ total: 2 }]);
      const query = rankingsQuerySchema.parse({ benchmark: 'MSCI World' });

      const aggregation = await queryRankingFundsAggregation(
        { $queryRaw: queryRaw },
        query,
      );

      expect(aggregation).toEqual({
        groupTotals: new Map([['msci world', 2]]),
        totalGroups: 1,
        totalEligibleFunds: 2,
      });
      expect(queryRaw).toHaveBeenCalledTimes(2);
    });
  });
});

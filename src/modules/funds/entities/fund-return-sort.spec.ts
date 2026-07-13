import type { FundApi } from './fund-api.schema';
import {
  filterEnrichedFundsByMinReturn,
  sortEnrichedFundsByCatalogField,
  sortEnrichedFundsByReturn,
} from './fund-return-sort';

describe('fund-return-sort', () => {
  const baseFund = {
    id: '1',
    symbol: 'AAA',
    name: 'Alpha Fund',
    score: 80,
    metrics: { ter: 0.2, aum: 1000 },
    riskLevel: 3,
    currency: 'EUR',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    returns: { ytd: null, oneYear: 10, threeYear: 20, asOf: null },
  } as FundApi;

  const betaFund = {
    ...baseFund,
    id: '2',
    symbol: 'BBB',
    name: 'Beta Fund',
    score: 70,
    metrics: { ter: 0.3, aum: 500 },
    returns: { ytd: null, oneYear: 5, threeYear: 15, asOf: null },
  } as FundApi;

  const missingFund = {
    ...baseFund,
    id: '3',
    symbol: 'CCC',
    name: 'Charlie Fund',
    returns: { ytd: null, oneYear: null, threeYear: null, asOf: null },
  } as FundApi;

  describe('sortEnrichedFundsByReturn', () => {
    it('sorts by one-year return descending', () => {
      expect(
        sortEnrichedFundsByReturn(
          [betaFund, missingFund, baseFund],
          'return1y',
          'desc',
        ).map((fund) => fund.id),
      ).toEqual(['1', '2', '3']);
    });

    it('sorts by three-year return ascending', () => {
      expect(
        sortEnrichedFundsByReturn([baseFund, betaFund], 'return3y', 'asc').map(
          (fund) => fund.id,
        ),
      ).toEqual(['2', '1']);
    });

    it('breaks ties by fund name when returns match', () => {
      const tiedAlpha = {
        ...baseFund,
        id: '4',
        name: 'Zulu Fund',
        returns: { ytd: null, oneYear: 10, threeYear: 10, asOf: null },
      } as FundApi;
      const tiedBeta = {
        ...baseFund,
        id: '5',
        name: 'Alpha Fund',
        returns: { ytd: null, oneYear: 10, threeYear: 10, asOf: null },
      } as FundApi;

      expect(
        sortEnrichedFundsByReturn(
          [tiedAlpha, tiedBeta],
          'return1y',
          'desc',
        ).map((fund) => fund.id),
      ).toEqual(['5', '4']);
    });

    it('breaks ties by fund name when both one-year returns are missing', () => {
      const missingAlpha = {
        ...missingFund,
        id: '12',
        name: 'Zulu Fund',
      } as FundApi;
      const missingBeta = {
        ...missingFund,
        id: '13',
        name: 'Alpha Fund',
      } as FundApi;

      expect(
        sortEnrichedFundsByReturn(
          [missingAlpha, missingBeta],
          'return1y',
          'desc',
        ).map((fund) => fund.id),
      ).toEqual(['13', '12']);
    });

    it('places funds with missing returns after funds with values', () => {
      expect(
        sortEnrichedFundsByReturn(
          [missingFund, baseFund],
          'return3y',
          'asc',
        ).map((fund) => fund.id),
      ).toEqual(['1', '3']);
    });
  });

  describe('filterEnrichedFundsByMinReturn', () => {
    it('returns a copy when no thresholds are provided', () => {
      const funds = [baseFund, betaFund];
      const filtered = filterEnrichedFundsByMinReturn(funds, {});

      expect(filtered).toEqual(funds);
      expect(filtered).not.toBe(funds);
    });

    it('filters by minimum one-year return', () => {
      expect(
        filterEnrichedFundsByMinReturn([baseFund, betaFund, missingFund], {
          minReturn1y: 8,
        }).map((fund) => fund.id),
      ).toEqual(['1']);
    });

    it('filters by minimum three-year return', () => {
      expect(
        filterEnrichedFundsByMinReturn([baseFund, betaFund, missingFund], {
          minReturn3y: 18,
        }).map((fund) => fund.id),
      ).toEqual(['1']);
    });

    it('applies both minimum return thresholds', () => {
      expect(
        filterEnrichedFundsByMinReturn([baseFund, betaFund], {
          minReturn1y: 8,
          minReturn3y: 18,
        }).map((fund) => fund.id),
      ).toEqual(['1']);
    });
  });

  describe('sortEnrichedFundsByCatalogField', () => {
    it('sorts by symbol ascending with nulls last', () => {
      const nullSymbolFund = {
        ...baseFund,
        id: '9',
        symbol: null,
      } as unknown as FundApi;

      expect(
        sortEnrichedFundsByCatalogField(
          [baseFund, betaFund, nullSymbolFund],
          'symbol',
          'asc',
        ).map((fund) => fund.id),
      ).toEqual(['1', '2', '9']);
    });

    it('sorts by score descending', () => {
      expect(
        sortEnrichedFundsByCatalogField(
          [betaFund, baseFund],
          'score',
          'desc',
        ).map((fund) => fund.id),
      ).toEqual(['1', '2']);
    });

    it('sorts by ter ascending and breaks ties by name', () => {
      const lowTer = {
        ...baseFund,
        id: '6',
        name: 'Bravo Fund',
        metrics: { ter: 0.1, aum: 1000 },
      } as FundApi;
      const tiedTer = {
        ...baseFund,
        id: '7',
        name: 'Alpha Fund',
        metrics: { ter: 0.1, aum: 1000 },
      } as FundApi;

      expect(
        sortEnrichedFundsByCatalogField([lowTer, tiedTer], 'ter', 'asc').map(
          (fund) => fund.id,
        ),
      ).toEqual(['7', '6']);
    });

    it('sorts by updatedAt using ISO strings', () => {
      const olderFund = {
        ...baseFund,
        id: '8',
        updatedAt: new Date('2024-06-01T00:00:00.000Z'),
      } as FundApi;

      expect(
        sortEnrichedFundsByCatalogField(
          [baseFund, olderFund],
          'updatedAt',
          'asc',
        ).map((fund) => fund.id),
      ).toEqual(['8', '1']);
    });

    it('sorts by currency alphabetically', () => {
      const usdFund = { ...baseFund, id: '10', currency: 'USD' } as FundApi;
      const eurFund = { ...betaFund, id: '11', currency: 'EUR' } as FundApi;

      expect(
        sortEnrichedFundsByCatalogField(
          [usdFund, eurFund],
          'currency',
          'asc',
        ).map((fund) => fund.id),
      ).toEqual(['11', '10']);
    });

    it('sorts by name when both catalog values are null', () => {
      const nullScoreA = {
        ...baseFund,
        id: '14',
        name: 'Zulu Fund',
        score: null,
      } as FundApi;
      const nullScoreB = {
        ...baseFund,
        id: '15',
        name: 'Alpha Fund',
        score: null,
      } as FundApi;

      expect(
        sortEnrichedFundsByCatalogField(
          [nullScoreA, nullScoreB],
          'score',
          'desc',
        ).map((fund) => fund.id),
      ).toEqual(['15', '14']);
    });

    it('sorts by aum and breaks numeric ties by name', () => {
      const highAum = {
        ...baseFund,
        id: '16',
        name: 'Bravo Fund',
        metrics: { ter: 0.2, aum: 1000 },
      } as FundApi;
      const tiedAum = {
        ...baseFund,
        id: '17',
        name: 'Alpha Fund',
        metrics: { ter: 0.2, aum: 1000 },
      } as FundApi;

      expect(
        sortEnrichedFundsByCatalogField([highAum, tiedAum], 'aum', 'asc').map(
          (fund) => fund.id,
        ),
      ).toEqual(['17', '16']);
    });

    it('sorts by fund name alphabetically', () => {
      expect(
        sortEnrichedFundsByCatalogField(
          [baseFund, betaFund],
          'name',
          'asc',
        ).map((fund) => fund.id),
      ).toEqual(['1', '2']);
    });

    it('sorts by createdAt using Date values', () => {
      const newerFund = {
        ...baseFund,
        id: '18',
        createdAt: new Date('2025-06-01T00:00:00.000Z'),
      } as FundApi;

      expect(
        sortEnrichedFundsByCatalogField(
          [newerFund, baseFund],
          'createdAt',
          'desc',
        ).map((fund) => fund.id),
      ).toEqual(['18', '1']);
    });

    it('sorts by risk level descending', () => {
      const lowRisk = { ...baseFund, id: '19', riskLevel: 2 } as FundApi;
      const highRisk = { ...betaFund, id: '20', riskLevel: 5 } as FundApi;

      expect(
        sortEnrichedFundsByCatalogField(
          [lowRisk, highRisk],
          'riskLevel',
          'desc',
        ).map((fund) => fund.id),
      ).toEqual(['20', '19']);
    });

    it('places null catalog values after populated values', () => {
      const nullTer = {
        ...baseFund,
        id: '21',
        metrics: { ter: null, aum: 1000 },
      } as FundApi;
      const valuedTer = {
        ...betaFund,
        id: '22',
        metrics: { ter: 0.3, aum: 500 },
      } as FundApi;

      expect(
        sortEnrichedFundsByCatalogField([nullTer, valuedTer], 'ter', 'asc').map(
          (fund) => fund.id,
        ),
      ).toEqual(['22', '21']);
    });
  });
});

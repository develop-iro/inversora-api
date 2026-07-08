import type { FundApi } from './fund-api.schema';
import { sortEnrichedFundsByReturn } from './fund-return-sort';

describe('sortEnrichedFundsByReturn', () => {
  const baseFund = {
    id: '1',
    symbol: 'AAA',
    name: 'Alpha Fund',
    returns: { ytd: null, oneYear: 10, threeYear: 20, asOf: null },
  } as FundApi;

  const betaFund = {
    ...baseFund,
    id: '2',
    symbol: 'BBB',
    name: 'Beta Fund',
    returns: { ytd: null, oneYear: 5, threeYear: 15, asOf: null },
  } as FundApi;

  const missingFund = {
    ...baseFund,
    id: '3',
    symbol: 'CCC',
    name: 'Charlie Fund',
    returns: { ytd: null, oneYear: null, threeYear: null, asOf: null },
  } as FundApi;

  it('should sort by one-year return descending', () => {
    expect(
      sortEnrichedFundsByReturn(
        [betaFund, missingFund, baseFund],
        'return1y',
        'desc',
      ).map((fund) => fund.id),
    ).toEqual(['1', '2', '3']);
  });

  it('should sort by three-year return ascending', () => {
    expect(
      sortEnrichedFundsByReturn([baseFund, betaFund], 'return3y', 'asc').map(
        (fund) => fund.id,
      ),
    ).toEqual(['2', '1']);
  });
});

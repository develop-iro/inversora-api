import type { Fund } from '../entities/fund.schema';

/** Default nullable profile fields for fund entity test fixtures. */
export const FUND_PROFILE_FIELD_DEFAULTS = {
  assetClass: null,
  domicile: null,
  investmentTheme: null,
  issuer: null,
} as const satisfies Pick<
  Fund,
  'assetClass' | 'domicile' | 'investmentTheme' | 'issuer'
>;

/** Default nullable materialized fields for fund entity test fixtures. */
export const FUND_MATERIALIZED_FIELD_DEFAULTS = {
  return1y: null,
  return3y: null,
  returnYtd: null,
  returnAsOf: null,
  scoreBreakdown: null,
  peerGroupKey: null,
  peerRank: null,
} as const;

/**
 * Merges fund entity test defaults with partial overrides.
 *
 * @param fund - Partial fund fixture.
 */
export function buildFundTestFixture(
  fund: Omit<
    Fund,
    'assetClass' | 'domicile' | 'investmentTheme' | 'issuer' | 'materialized'
  > &
    Partial<
      Pick<
        Fund,
        | 'assetClass'
        | 'domicile'
        | 'investmentTheme'
        | 'issuer'
        | 'materialized'
      >
    >,
): Fund {
  return {
    ...FUND_PROFILE_FIELD_DEFAULTS,
    materialized: {
      ...FUND_MATERIALIZED_FIELD_DEFAULTS,
      ...fund.materialized,
    },
    ...fund,
  };
}

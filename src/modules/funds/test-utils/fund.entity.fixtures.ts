import type { Fund } from '../entities/fund.schema';

/** Default nullable profile fields for fund entity test fixtures. */
export const FUND_PROFILE_FIELD_DEFAULTS = {
  assetClass: null,
  domicile: null,
  investmentTheme: null,
} as const satisfies Pick<Fund, 'assetClass' | 'domicile' | 'investmentTheme'>;

/**
 * Merges fund entity test defaults with partial overrides.
 *
 * @param fund - Partial fund fixture.
 */
export function buildFundTestFixture(
  fund: Omit<Fund, 'assetClass' | 'domicile' | 'investmentTheme'> &
    Partial<Pick<Fund, 'assetClass' | 'domicile' | 'investmentTheme'>>,
): Fund {
  return {
    ...FUND_PROFILE_FIELD_DEFAULTS,
    ...fund,
  };
}

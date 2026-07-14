import { mapFundBrandingFields } from '../branding/fund-branding.utils';
import { fundApiSchema, type FundApi } from './fund-api.schema';
import { mapMaterializedFieldsToReturnSnapshot } from './fund-materialized.mapper';
import { mergeReturnSnapshots } from './fund-returns.enricher';
import type { FundReturnSnapshot } from './fund-return-snapshot.schema';
import type { Fund } from './fund.schema';

/**
 * Maps a domain fund entity to the public HTTP API payload.
 *
 * @param fund - Persisted domain fund entity.
 * @param brandfetchClientId - Brandfetch client ID used to build `logoUrl`.
 * @param returnFallbacks - Optional price-derived return snapshots keyed by fund id.
 */
export function mapFundToApiFund(
  fund: Fund,
  brandfetchClientId?: string,
  returnFallbacks?: ReadonlyMap<string, FundReturnSnapshot>,
): FundApi {
  const branding = mapFundBrandingFields(fund, brandfetchClientId);
  const returns = mergeReturnSnapshots(
    mapMaterializedFieldsToReturnSnapshot(fund.materialized),
    returnFallbacks?.get(fund.id),
  );

  return fundApiSchema.parse({
    ...fund,
    logoUrl: branding.logoUrl,
    returns,
  });
}

/**
 * Maps multiple domain fund entities to public HTTP API payloads.
 *
 * @param funds - Persisted domain fund entities.
 * @param brandfetchClientId - Brandfetch client ID used to build `logoUrl`.
 * @param returnFallbacks - Optional price-derived return snapshots keyed by fund id.
 */
export function mapFundsToApiFunds(
  funds: readonly Fund[],
  brandfetchClientId?: string,
  returnFallbacks?: ReadonlyMap<string, FundReturnSnapshot>,
): FundApi[] {
  return funds.map((fund) =>
    mapFundToApiFund(fund, brandfetchClientId, returnFallbacks),
  );
}
/**
 * Maps fund card branding fields for BFF featured/detail payloads.
 *
 * @param fund - Persisted domain fund entity.
 * @param brandfetchClientId - Brandfetch client ID used to build `logoUrl`.
 */
export function mapFundCardBranding(
  fund: Fund,
  brandfetchClientId?: string,
): {
  symbol: string;
  issuer: string | null;
  logoUrl: string | null;
} {
  return mapFundBrandingFields(fund, brandfetchClientId);
}

import {
  buildBrandfetchLogoUrlForDomain,
  buildBrandfetchLogoUrlForIsin,
  buildBrandfetchLogoUrlForTicker,
} from './brandfetch-logo-url.builder';
import { ISSUER_DOMAIN_ALIASES } from './issuer-domain-map.config';

/** Fund fields used to resolve manager branding for API responses. */
export type FundBrandingSource = {
  readonly issuer: string | null;
  readonly isin: string | null;
  readonly symbol: string;
};

/** Branding fields exposed on fund card API payloads. */
export type FundBrandingFields = {
  readonly symbol: string;
  readonly issuer: string | null;
  readonly logoUrl: string | null;
};

/**
 * Normalizes an issuer label for alias lookup.
 *
 * @param issuer - Raw issuer label from FMP.
 */
export function normalizeIssuerLabel(issuer: string): string {
  return issuer.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Resolves a Brandfetch domain from a persisted issuer label.
 *
 * @param issuer - Asset manager name from FMP `etfCompany`.
 */
export function resolveIssuerDomain(issuer: string | null): string | null {
  if (issuer === null || issuer.trim().length === 0) {
    return null;
  }

  const normalized = normalizeIssuerLabel(issuer);
  const exactMatch = ISSUER_DOMAIN_ALIASES[normalized];

  if (exactMatch !== undefined) {
    return exactMatch;
  }

  for (const [alias, domain] of Object.entries(ISSUER_DOMAIN_ALIASES)) {
    if (normalized.includes(alias) || alias.includes(normalized)) {
      return domain;
    }
  }

  return null;
}

/**
 * Resolves a Brandfetch Logo CDN URL for a fund card.
 *
 * Resolution order: issuer domain map, ISIN, ticker.
 *
 * @param source - Fund branding source fields.
 * @param clientId - Brandfetch client ID; when absent, returns `null`.
 */
export function resolveFundLogoUrl(
  source: FundBrandingSource,
  clientId?: string,
): string | null {
  const normalizedClientId = clientId?.trim();

  if (normalizedClientId === undefined || normalizedClientId.length === 0) {
    return null;
  }

  const domain = resolveIssuerDomain(source.issuer);

  if (domain !== null) {
    return buildBrandfetchLogoUrlForDomain(domain, normalizedClientId);
  }

  if (source.isin !== null && source.isin.trim().length > 0) {
    return buildBrandfetchLogoUrlForIsin(source.isin, normalizedClientId);
  }

  if (source.symbol.trim().length > 0) {
    return buildBrandfetchLogoUrlForTicker(source.symbol, normalizedClientId);
  }

  return null;
}

/**
 * Maps fund branding source fields to API card branding properties.
 *
 * @param source - Fund branding source fields.
 * @param clientId - Brandfetch client ID; when absent, `logoUrl` is `null`.
 */
export function mapFundBrandingFields(
  source: FundBrandingSource,
  clientId?: string,
): FundBrandingFields {
  return {
    symbol: source.symbol.trim().toUpperCase(),
    issuer: source.issuer,
    logoUrl: resolveFundLogoUrl(source, clientId),
  };
}

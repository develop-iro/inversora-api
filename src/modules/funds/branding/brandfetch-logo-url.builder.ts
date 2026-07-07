/** Brandfetch Logo API CDN base URL. */
export const BRANDFETCH_LOGO_CDN_BASE_URL = 'https://cdn.brandfetch.io';

/** Supported Brandfetch logo variants. */
export type BrandfetchLogoType = 'icon' | 'logo' | 'symbol';

/** Options for constructing a Brandfetch Logo CDN URL. */
export type BrandfetchLogoUrlOptions = {
  readonly width?: number;
  readonly height?: number;
  readonly theme?: 'light' | 'dark';
  readonly fallback?: '404' | 'lettermark' | 'transparent';
};

const DEFAULT_LOGO_SIZE = 64;
const DEFAULT_LOGO_THEME = 'dark';
const DEFAULT_LOGO_FALLBACK = 'lettermark';

/**
 * Builds shared Brandfetch render path segments for hotlinked logo URLs.
 *
 * @param options - Optional size, theme, and fallback behavior.
 */
function buildBrandfetchRenderPath(
  options: BrandfetchLogoUrlOptions = {},
): string {
  const width = options.width ?? DEFAULT_LOGO_SIZE;
  const height = options.height ?? DEFAULT_LOGO_SIZE;
  const theme = options.theme ?? DEFAULT_LOGO_THEME;
  const fallback = options.fallback ?? DEFAULT_LOGO_FALLBACK;

  return `/w/${width}/h/${height}/theme/${theme}/fallback/${fallback}`;
}

/**
 * Builds a Brandfetch Logo CDN URL for a domain identifier.
 *
 * @param domain - Company domain (e.g. `vanguard.com`).
 * @param clientId - Brandfetch client ID from the developer portal.
 * @param options - Optional size, theme, and fallback behavior.
 */
export function buildBrandfetchLogoUrlForDomain(
  domain: string,
  clientId: string,
  options: BrandfetchLogoUrlOptions = {},
): string {
  const normalizedDomain = domain.trim().toLowerCase();
  const normalizedClientId = clientId.trim();

  return `${BRANDFETCH_LOGO_CDN_BASE_URL}/domain/${encodeURIComponent(normalizedDomain)}${buildBrandfetchRenderPath(options)}?c=${encodeURIComponent(normalizedClientId)}`;
}

/**
 * Builds a Brandfetch Logo CDN URL for an ISIN identifier.
 *
 * @param isin - ISO 6166 ISIN code.
 * @param clientId - Brandfetch client ID from the developer portal.
 * @param options - Optional size, theme, and fallback behavior.
 */
export function buildBrandfetchLogoUrlForIsin(
  isin: string,
  clientId: string,
  options: BrandfetchLogoUrlOptions = {},
): string {
  const normalizedIsin = isin.trim().toUpperCase();
  const normalizedClientId = clientId.trim();

  return `${BRANDFETCH_LOGO_CDN_BASE_URL}/isin/${encodeURIComponent(normalizedIsin)}${buildBrandfetchRenderPath(options)}?c=${encodeURIComponent(normalizedClientId)}`;
}

/**
 * Builds a Brandfetch Logo CDN URL for a stock or ETF ticker.
 *
 * @param symbol - Fund ticker symbol.
 * @param clientId - Brandfetch client ID from the developer portal.
 * @param options - Optional size, theme, and fallback behavior.
 */
export function buildBrandfetchLogoUrlForTicker(
  symbol: string,
  clientId: string,
  options: BrandfetchLogoUrlOptions = {},
): string {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const normalizedClientId = clientId.trim();

  return `${BRANDFETCH_LOGO_CDN_BASE_URL}/ticker/${encodeURIComponent(normalizedSymbol)}${buildBrandfetchRenderPath(options)}?c=${encodeURIComponent(normalizedClientId)}`;
}

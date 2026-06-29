import {
  buildBrandfetchLogoUrlForDomain,
  buildBrandfetchLogoUrlForIsin,
  buildBrandfetchLogoUrlForTicker,
} from './brandfetch-logo-url.builder';

import {
  mapFundBrandingFields,
  resolveFundLogoUrl,
  resolveIssuerDomain,
} from './fund-branding.utils';

const BRANDFETCH_RENDER_PATH = '/w/64/h/64/theme/dark/fallback/404';

describe('brandfetch-logo-url.builder', () => {
  it('should build a domain logo URL with size, theme, and fallback segments', () => {
    expect(
      buildBrandfetchLogoUrlForDomain('vanguard.com', 'test-client-id', {
        width: 64,

        height: 64,
      }),
    ).toBe(
      `https://cdn.brandfetch.io/domain/vanguard.com${BRANDFETCH_RENDER_PATH}?c=test-client-id`,
    );
  });

  it('should build an ISIN logo URL', () => {
    expect(
      buildBrandfetchLogoUrlForIsin('US78462F1030', 'test-client-id'),
    ).toBe(
      `https://cdn.brandfetch.io/isin/US78462F1030${BRANDFETCH_RENDER_PATH}?c=test-client-id`,
    );
  });

  it('should build a ticker logo URL', () => {
    expect(buildBrandfetchLogoUrlForTicker('spy', 'test-client-id')).toBe(
      `https://cdn.brandfetch.io/ticker/SPY${BRANDFETCH_RENDER_PATH}?c=test-client-id`,
    );
  });
});

describe('fund-branding.utils', () => {
  it('should resolve issuer domains from FMP labels', () => {
    expect(resolveIssuerDomain('State Street')).toBe('ssga.com');

    expect(resolveIssuerDomain('Vanguard Group')).toBe('vanguard.com');
  });

  it('should prefer issuer domain over ISIN fallback', () => {
    expect(
      resolveFundLogoUrl(
        {
          issuer: 'Vanguard',

          isin: 'US78462F1030',

          symbol: 'VOO',
        },

        'test-client-id',
      ),
    ).toBe(
      `https://cdn.brandfetch.io/domain/vanguard.com${BRANDFETCH_RENDER_PATH}?c=test-client-id`,
    );
  });

  it('should fall back to ISIN when issuer is unknown', () => {
    expect(
      resolveFundLogoUrl(
        {
          issuer: null,

          isin: 'US78462F1030',

          symbol: 'SPY',
        },

        'test-client-id',
      ),
    ).toBe(
      `https://cdn.brandfetch.io/isin/US78462F1030${BRANDFETCH_RENDER_PATH}?c=test-client-id`,
    );
  });

  it('should return null when Brandfetch client ID is missing', () => {
    expect(
      mapFundBrandingFields({
        issuer: 'Vanguard',

        isin: 'US9229083632',

        symbol: 'VOO',
      }).logoUrl,
    ).toBeNull();
  });
});

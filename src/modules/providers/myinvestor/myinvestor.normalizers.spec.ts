import {
  normalizeMyInvestorExposures,
  normalizeMyInvestorFund,
  normalizeMyInvestorFunds,
} from './myinvestor.normalizers';
import type { MyInvestorFund } from './myinvestor.raw.schemas';

describe('MyInvestor normalizers', () => {
  const rawFund: MyInvestorFund = {
    isin: 'ie00b03hd191',
    name: '  Vanguard Global Stock Index Fund EUR Acc ',
    product_type: 'FONDOS_INDEXADOS',
    asset_class: 'Renta Variable',
    category: 'Otros',
    category_morningstar: 'RV Global Cap. Grande Blend',
    geographic_zone: 'Global',
    management_company: 'Vanguard',
    status: 'OPEN',
    ter: 0.18,
    risk_indicator: 4,
    mstar_rating: 4,
    volatility_1y: 10.5,
    volatility_3y: 11.65,
    volatility_5y: 13.35,
    tracking_error_1y: 1.56,
    ytd: 13.28,
    return_1y: 23.98,
    return_3y: 18.2,
    return_5y: 12.07,
    aum: 23_363_476_658,
    nav: 62.7241,
    nav_date: '2026-07-09T00:00:00Z',
    inception_date: '1998-08-04T00:00:00Z',
    alloc_equity: 99.97,
    alloc_bond: 0,
    alloc_cash: 0,
    alloc_other: 0.03,
    currency: 'EUR',
    distributing: 0,
    esg: 0,
    min_initial: '1.00 EUR',
    description: null,
    url_kiid: 'https://api.fundinfo.com/document/example.pdf',
    top_sectors: [
      { name: 'Servicios Financieros', pct: 15 },
      { name: 'Tecnología', pct: 31 },
      { name: 'Sin peso', pct: 0 },
    ],
    top_regions: [],
    warning_text:
      'iShares Developed World Index es el fondo de menor coste. Esto no es una recomendación.',
  };

  it('normalizes a raw fund into the domain shape', () => {
    const fund = normalizeMyInvestorFund(rawFund);

    expect(fund).toMatchObject({
      isin: 'IE00B03HD191',
      name: 'Vanguard Global Stock Index Fund EUR Acc',
      productType: 'FONDOS_INDEXADOS',
      managementCompany: 'Vanguard',
      ter: 0.18,
      srri: 4,
      morningstarRating: 4,
      trackingError1y: 1.56,
      return1yPercent: 23.98,
      assetsUnderManagement: 23_363_476_658,
      navDate: '2026-07-09',
      inceptionDate: '1998-08-04',
      distributing: false,
      esg: false,
      kiidUrl: 'https://api.fundinfo.com/document/example.pdf',
    });
  });

  it('never carries provider advisory copy into the domain shape', () => {
    const fund = normalizeMyInvestorFund(rawFund);

    expect(fund).not.toBeNull();
    expect(JSON.stringify(fund)).not.toContain('recomendación');
    expect(fund).not.toHaveProperty('warning_text');
  });

  it('sorts exposures by weight and drops zero-weight rows', () => {
    const fund = normalizeMyInvestorFund(rawFund);

    expect(fund?.topSectors).toEqual([
      { name: 'Tecnología', weightPercentage: 31 },
      { name: 'Servicios Financieros', weightPercentage: 15 },
    ]);
    expect(fund?.topRegions).toEqual([]);
  });

  it('keeps null metrics as undefined instead of failing', () => {
    const fund = normalizeMyInvestorFund({
      isin: 'IE000N4ZYX28',
      name: 'iShares US Equity Index Fund clase S',
      ter: 0.05,
      mstar_rating: null,
      volatility_3y: null,
      tracking_error_1y: null,
      return_1y: null,
      nav_date: null,
      url_kiid: null,
    });

    expect(fund).toMatchObject({
      isin: 'IE000N4ZYX28',
      ter: 0.05,
    });
    expect(fund?.morningstarRating).toBeUndefined();
    expect(fund?.trackingError1y).toBeUndefined();
    expect(fund?.navDate).toBeUndefined();
    expect(fund?.kiidUrl).toBeUndefined();
  });

  it('drops insecure KIID links', () => {
    const fund = normalizeMyInvestorFund({
      ...rawFund,
      url_kiid: 'http://insecure.example.com/kiid.pdf',
    });

    expect(fund?.kiidUrl).toBeUndefined();
  });

  it('drops rows that fail domain validation', () => {
    const funds = normalizeMyInvestorFunds([
      rawFund,
      { ...rawFund, isin: 'LU0996177134', risk_indicator: 99 },
    ]);

    expect(funds).toHaveLength(1);
    expect(funds[0]?.isin).toBe('IE00B03HD191');
  });

  it('normalizes exposures defensively for null inputs', () => {
    expect(normalizeMyInvestorExposures(null)).toEqual([]);
    expect(normalizeMyInvestorExposures(undefined)).toEqual([]);
  });
});

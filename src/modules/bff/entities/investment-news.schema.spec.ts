import { assertSafeNewsUrl } from './investment-news.schema';

describe('investment-news.schema', () => {
  it('accepts https news URLs', () => {
    expect(assertSafeNewsUrl('https://www.cnmv.es/education')).toBe(
      'https://www.cnmv.es/education',
    );
  });

  it('rejects non-https news URLs', () => {
    expect(() => assertSafeNewsUrl('http://www.cnmv.es/education')).toThrow();
  });
});

import { sanitizeUrlForLog } from './sanitize-url-for-log';

describe('sanitizeUrlForLog', () => {
  it('should redact sensitive query parameters', () => {
    expect(
      sanitizeUrlForLog(
        'https://financialmodelingprep.com/stable/quote?symbol=SPY&apikey=secret-key',
      ),
    ).toBe(
      'https://financialmodelingprep.com/stable/quote?symbol=SPY&apikey=%5Bredacted%5D',
    );
  });

  it('should return the original value when the URL is invalid', () => {
    expect(sanitizeUrlForLog('not-a-url')).toBe('not-a-url');
  });
});

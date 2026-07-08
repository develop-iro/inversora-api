import { secureCompareApiKey } from './api-key.utils';

describe('secureCompareApiKey', () => {
  it('should return true for matching keys', () => {
    expect(
      secureCompareApiKey('local-dev-admin-key', 'local-dev-admin-key'),
    ).toBe(true);
  });

  it('should return false for mismatched keys', () => {
    expect(secureCompareApiKey('wrong-key', 'local-dev-admin-key')).toBe(false);
  });

  it('should return false when lengths differ', () => {
    expect(secureCompareApiKey('short', 'much-longer-key-value')).toBe(false);
  });

  it('should return false when either value is undefined', () => {
    expect(secureCompareApiKey(undefined, 'local-dev-admin-key')).toBe(false);
    expect(secureCompareApiKey('local-dev-admin-key', undefined)).toBe(false);
  });
});

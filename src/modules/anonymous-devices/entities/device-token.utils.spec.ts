import {
  generateDeviceToken,
  hashDeviceToken,
  isDeviceTokenFormatValid,
} from './device-token.utils';

describe('device-token.utils', () => {
  it('generates tokens with the expected prefix', () => {
    const token = generateDeviceToken();

    expect(isDeviceTokenFormatValid(token)).toBe(true);
    expect(token.startsWith('dev_')).toBe(true);
  });

  it('hashes tokens deterministically', () => {
    const token = generateDeviceToken();
    const firstHash = hashDeviceToken(token);
    const secondHash = hashDeviceToken(token);

    expect(firstHash).toBe(secondHash);
    expect(firstHash).not.toBe(token);
  });
});

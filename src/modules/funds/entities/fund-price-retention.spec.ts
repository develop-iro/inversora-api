import { addDaysToIsoDate, getTodayIsoDate } from './fund-price.mapper';
import { getFundPriceRetentionCutoffIsoDate } from './fund-price-retention';

describe('getFundPriceRetentionCutoffIsoDate', () => {
  it('should subtract the requested number of calendar years from today', () => {
    expect(getFundPriceRetentionCutoffIsoDate(7)).toBe(
      addDaysToIsoDate(getTodayIsoDate(), -7 * 365),
    );
  });
});

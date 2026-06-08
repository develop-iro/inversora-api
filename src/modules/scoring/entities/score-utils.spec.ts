import {
  blendAnnualizedReturn,
  clampScore,
  computeRiskAdjustedReturnRatio,
  percentileRank,
} from './score-utils';

describe('score-utils', () => {
  it('should clamp scores to the 0-100 range', () => {
    expect(clampScore(120)).toBe(100);
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(87.4)).toBe(87);
  });

  it('should blend 1Y and 3Y returns when both are available', () => {
    expect(blendAnnualizedReturn(20, 10)).toBeCloseTo(16, 5);
    expect(blendAnnualizedReturn(20, null)).toBe(20);
    expect(blendAnnualizedReturn(null, 10)).toBe(10);
    expect(blendAnnualizedReturn(null, null)).toBeNull();
  });

  it('should compute the risk-adjusted return ratio', () => {
    expect(computeRiskAdjustedReturnRatio(15, 10)).toBe(1.5);
    expect(computeRiskAdjustedReturnRatio(15, 0)).toBeNull();
    expect(computeRiskAdjustedReturnRatio(null, 10)).toBeNull();
  });

  it('should rank values against peers', () => {
    expect(percentileRank(15, [10, 12, 14, 16], true)).toBe(0.75);
    expect(percentileRank(8, [10, 12, 14, 16], false)).toBe(1);
    expect(percentileRank(14, [10, 12, 14, 16], false)).toBe(0.5);
  });
});

import { buildRiskProfileWhereInput } from './fund-risk-profile.mapper';

describe('buildRiskProfileWhereInput', () => {
  it('should map low risk to levels 1 through 2', () => {
    expect(buildRiskProfileWhereInput('low')).toEqual({
      riskLevel: { gte: 1, lte: 2 },
    });
  });

  it('should map medium risk to null and levels 3 through 5', () => {
    expect(buildRiskProfileWhereInput('medium')).toEqual({
      OR: [{ riskLevel: null }, { riskLevel: { gte: 3, lte: 5 } }],
    });
  });

  it('should map high risk to levels 6 through 7', () => {
    expect(buildRiskProfileWhereInput('high')).toEqual({
      riskLevel: { gte: 6, lte: 7 },
    });
  });

  it('should return null for the all profile', () => {
    expect(buildRiskProfileWhereInput('all')).toBeNull();
  });
});

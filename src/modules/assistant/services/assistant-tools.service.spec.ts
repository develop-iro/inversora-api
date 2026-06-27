import { NotFoundException } from '@nestjs/common';

import { AssistantToolsService } from './assistant-tools.service';

describe('AssistantToolsService', () => {
  let service: AssistantToolsService;
  let fundsRepository: { findByIsin: jest.Mock; findByIsins: jest.Mock };
  let scoringService: { calculateScoreForFundId: jest.Mock };
  let catalogVisibilityService: { assertPublicCatalogVisible: jest.Mock };
  let glossaryService: { lookup: jest.Mock };

  beforeEach(() => {
    fundsRepository = {
      findByIsin: jest.fn(),
      findByIsins: jest.fn(),
    };
    scoringService = {
      calculateScoreForFundId: jest.fn(),
    };
    catalogVisibilityService = {
      assertPublicCatalogVisible: jest.fn(),
    };
    glossaryService = {
      lookup: jest.fn(),
    };
    service = new AssistantToolsService(
      fundsRepository as never,
      scoringService as never,
      catalogVisibilityService as never,
      glossaryService as never,
    );
  });

  it('returns score breakdown details', async () => {
    fundsRepository.findByIsin.mockResolvedValue(buildFund());
    scoringService.calculateScoreForFundId.mockResolvedValue({
      score: 88,
      summary: 'Coste bajo.',
      warnings: [],
      version: 'rn-04',
      breakdown: {
        ter: { points: 36, maxPoints: 40, label: 'TER' },
        tracking: { points: 34, maxPoints: 40, label: 'Tracking error' },
        aum: { points: 8, maxPoints: 10, label: 'AUM' },
        age: { points: 10, maxPoints: 10, label: 'Antigüedad' },
      },
    });

    await expect(
      service.getScoreBreakdown('us78462f1030'),
    ).resolves.toMatchObject({
      isin: 'US78462F1030',
      score: 88,
      breakdown: {
        ter: { points: 36, maxPoints: 40, label: 'TER' },
      },
    });
  });

  it('validates comparison fairness for mixed benchmarks', async () => {
    const first = buildFund({
      id: 'fund-1',
      isin: 'US78462F1030',
      benchmark: 'S&P 500',
      currency: 'USD',
      vehicle: 'etf',
    });
    const second = buildFund({
      id: 'fund-2',
      isin: 'US46090E1038',
      benchmark: 'Russell 2000',
      currency: 'EUR',
      vehicle: 'mutual-fund',
    });
    fundsRepository.findByIsins.mockResolvedValue(
      new Map([
        ['US78462F1030', first],
        ['US46090E1038', second],
      ]),
    );

    const result = await service.validateComparisonFairness([
      'US78462F1030',
      'US46090E1038',
    ]);

    expect(result.isFair).toBe(false);
    expect(
      result.warnings.some((warning) =>
        warning.includes('benchmarks distintos'),
      ),
    ).toBe(true);
  });

  it('returns glossary terms for SORA tools', () => {
    glossaryService.lookup.mockReturnValue({
      term: 'TER',
      explanation: 'Comision anual total.',
      keywords: ['ter'],
    });

    expect(service.getGlossaryTerm('ter')).toEqual({
      term: 'TER',
      explanation: 'Comision anual total.',
    });
  });

  it('returns a fund snapshot with score details', async () => {
    fundsRepository.findByIsin.mockResolvedValue(buildFund());
    scoringService.calculateScoreForFundId.mockResolvedValue({
      score: 88,
      summary: 'Coste bajo.',
      warnings: [],
      version: 'rn-04',
    });

    await expect(
      service.getFundSnapshot('us78462f1030'),
    ).resolves.toMatchObject({
      isin: 'US78462F1030',
      symbol: 'SPY',
      score: { value: 88, version: 'rn-04' },
    });
    expect(fundsRepository.findByIsin).toHaveBeenCalledWith('US78462F1030');
  });

  it('throws when a snapshot fund does not exist', async () => {
    fundsRepository.findByIsin.mockResolvedValue(null);

    await expect(
      service.getFundSnapshot('US0000000000'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('falls back to the requested isin when the fund has no isin stored', async () => {
    fundsRepository.findByIsin.mockResolvedValue(
      buildFund({ isin: null as unknown as string }),
    );
    scoringService.calculateScoreForFundId.mockResolvedValue(null);

    await expect(
      service.getFundSnapshot('us78462f1030'),
    ).resolves.toMatchObject({
      isin: 'US78462F1030',
      score: { value: null },
    });
  });

  it('skips missing funds when comparing snapshots', async () => {
    const first = buildFund({
      id: 'fund-1',
      isin: 'US78462F1030',
      symbol: 'SPY',
    });
    fundsRepository.findByIsins.mockResolvedValue(
      new Map([['US78462F1030', first]]),
    );
    scoringService.calculateScoreForFundId.mockResolvedValue({
      score: 88,
      version: 'rn-04',
    });

    await expect(
      service.compareFunds(['US78462F1030', 'US0000000000']),
    ).resolves.toMatchObject({
      funds: [{ isin: 'US78462F1030', score: { value: 88 } }],
    });
  });

  it('returns comparable fund snapshots in requested order', async () => {
    const first = buildFund({
      id: 'fund-1',
      isin: 'US78462F1030',
      symbol: 'SPY',
    });
    const second = buildFund({
      id: 'fund-2',
      isin: 'US46090E1038',
      symbol: 'IWM',
    });
    fundsRepository.findByIsins.mockResolvedValue(
      new Map([
        ['US78462F1030', first],
        ['US46090E1038', second],
      ]),
    );
    scoringService.calculateScoreForFundId
      .mockResolvedValueOnce({ score: 88, version: 'rn-04' })
      .mockResolvedValueOnce({ score: 72, version: 'rn-04' });

    await expect(
      service.compareFunds(['us78462f1030', 'US46090E1038']),
    ).resolves.toMatchObject({
      funds: [
        { isin: 'US78462F1030', symbol: 'SPY', score: { value: 88 } },
        { isin: 'US46090E1038', symbol: 'IWM', score: { value: 72 } },
      ],
    });
  });
});

function buildFund(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fund-1',
    symbol: 'SPY',
    isin: 'US78462F1030',
    name: 'SPDR S&P 500 ETF Trust',
    vehicle: 'etf',
    currency: 'USD',
    benchmark: 'S&P 500',
    riskLevel: 4,
    metrics: {
      ter: 0.09,
      volatility: null,
      drawdown: null,
      aum: null,
      per: null,
      dividendYield: null,
      trackingError: null,
    },
    ...overrides,
  };
}

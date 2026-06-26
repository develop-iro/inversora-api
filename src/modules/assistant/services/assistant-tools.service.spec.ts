import { NotFoundException } from '@nestjs/common';

import { AssistantToolsService } from './assistant-tools.service';

describe('AssistantToolsService', () => {
  let service: AssistantToolsService;
  let fundsRepository: { findByIsin: jest.Mock; findByIsins: jest.Mock };
  let scoringService: { calculateScoreForFundId: jest.Mock };
  let catalogVisibilityService: { assertPublicCatalogVisible: jest.Mock };

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
    service = new AssistantToolsService(
      fundsRepository as never,
      scoringService as never,
      catalogVisibilityService as never,
    );
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

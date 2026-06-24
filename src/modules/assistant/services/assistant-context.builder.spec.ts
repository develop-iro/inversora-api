import { Test, TestingModule } from '@nestjs/testing';

import { FundsRepository } from '../../funds/repositories/funds.repository';
import { ScoringService } from '../../scoring/services/scoring.service';
import { AssistantContextBuilderService } from './assistant-context.builder';

describe('AssistantContextBuilderService', () => {
  let service: AssistantContextBuilderService;
  let fundsRepository: { findByIsin: jest.Mock };
  let scoringService: { calculateScoreForFundId: jest.Mock };

  beforeEach(async () => {
    fundsRepository = {
      findByIsin: jest.fn(),
    };
    scoringService = {
      calculateScoreForFundId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssistantContextBuilderService,
        {
          provide: FundsRepository,
          useValue: fundsRepository,
        },
        {
          provide: ScoringService,
          useValue: scoringService,
        },
      ],
    }).compile();

    service = module.get(AssistantContextBuilderService);
  });

  it('returns base context when no fund is requested', async () => {
    const context = await service.build(
      {
        surface: 'home',
        message: '¿Qué es el TER?',
      },
      'general',
    );

    expect(context).toEqual({
      surface: 'home',
      intent: 'general',
      locale: 'es',
      userMessage: '¿Qué es el TER?',
    });
    expect(fundsRepository.findByIsin).not.toHaveBeenCalled();
  });

  it('returns base context when the fund is not found', async () => {
    fundsRepository.findByIsin.mockResolvedValue(null);

    const context = await service.build(
      {
        surface: 'fund_detail',
        message: 'Explícame este fondo',
        fund: { isin: 'US0000000000' },
      },
      'explain_score',
    );

    expect(context.fund).toBeUndefined();
    expect(scoringService.calculateScoreForFundId).not.toHaveBeenCalled();
  });

  it('enriches context with fund and score data', async () => {
    fundsRepository.findByIsin.mockResolvedValue({
      id: 'fund-1',
      isin: 'US78462F1030',
      name: 'SPDR S&P 500 ETF Trust',
      benchmark: 'S&P 500',
      metrics: { ter: 0.09 },
    });
    scoringService.calculateScoreForFundId.mockResolvedValue({
      score: 88,
      summary: 'Buen equilibrio entre coste y tamaño.',
      warnings: ['Tracking error no disponible'],
      version: 'rn-04',
    });

    const context = await service.build(
      {
        surface: 'fund_detail',
        message: 'Explícame el score',
        locale: 'es',
        fund: { isin: 'US78462F1030' },
      },
      'explain_score',
    );

    expect(context.fund).toEqual({
      isin: 'US78462F1030',
      name: 'SPDR S&P 500 ETF Trust',
      benchmark: 'S&P 500',
      ter: 0.09,
      score: 88,
      scoreSummary: 'Buen equilibrio entre coste y tamaño.',
      scoreWarnings: ['Tracking error no disponible'],
      scoreVersion: 'rn-04',
    });
  });

  it('falls back to request ISIN when persisted fund ISIN is missing', async () => {
    fundsRepository.findByIsin.mockResolvedValue({
      id: 'fund-1',
      isin: null,
      name: 'Fondo sin ISIN persistido',
      benchmark: null,
      metrics: { ter: null },
    });
    scoringService.calculateScoreForFundId.mockResolvedValue(null);

    const context = await service.build(
      {
        surface: 'fund_detail',
        message: 'Explícame este producto',
        fund: { isin: 'US0000000001' },
      },
      'general',
    );

    expect(context.fund?.isin).toBe('US0000000001');
    expect(context.fund?.score).toBeNull();
  });
});

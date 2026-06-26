import { Test, TestingModule } from '@nestjs/testing';

import { FundsRepository } from '../../funds/repositories/funds.repository';
import { ScoringService } from '../../scoring/services/scoring.service';
import { AssistantContextBuilderService } from './assistant-context.builder';

describe('AssistantContextBuilderService', () => {
  let service: AssistantContextBuilderService;
  let fundsRepository: { findByIsins: jest.Mock };
  let scoringService: { calculateScoreForFundId: jest.Mock };

  beforeEach(async () => {
    fundsRepository = {
      findByIsins: jest.fn(),
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
        message: 'Que es el TER?',
      },
      'general',
    );

    expect(context).toEqual({
      surface: 'home',
      intent: 'general',
      locale: 'es',
      userMessage: 'Que es el TER?',
      sessionId: undefined,
    });
    expect(fundsRepository.findByIsins).not.toHaveBeenCalled();
  });

  it('includes recent messages in base chat context', async () => {
    const recentMessages = [
      {
        role: 'user' as const,
        content: 'Que es el TER?',
        intent: 'explain_term' as const,
        createdAt: '2026-06-25T08:00:00.000Z',
      },
    ];

    const context = await service.build(
      {
        surface: 'home',
        message: 'Y como afecta?',
        sessionId: 'session-1',
      },
      'general',
      recentMessages,
    );

    expect(context.recentMessages).toEqual(recentMessages);
  });

  it('returns base context when the fund is not found', async () => {
    fundsRepository.findByIsins.mockResolvedValue(new Map());

    const context = await service.build(
      {
        surface: 'fund-detail',
        message: 'Explicame este fondo',
        fund: { isin: 'US0000000000' },
      },
      'explain_score',
    );

    expect(context.fund).toBeUndefined();
    expect(scoringService.calculateScoreForFundId).not.toHaveBeenCalled();
  });

  it('enriches context with fund and score data', async () => {
    fundsRepository.findByIsins.mockResolvedValue(
      new Map([
        [
          'US78462F1030',
          {
            id: 'fund-1',
            isin: 'US78462F1030',
            name: 'SPDR S&P 500 ETF Trust',
            benchmark: 'S&P 500',
            metrics: { ter: 0.09 },
          },
        ],
      ]),
    );
    scoringService.calculateScoreForFundId.mockResolvedValue({
      score: 88,
      summary: 'Buen equilibrio entre coste y tamano.',
      warnings: ['Tracking error no disponible'],
      version: 'rn-04',
    });

    const context = await service.build(
      {
        surface: 'fund-detail',
        message: 'Explicame el score',
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
      scoreSummary: 'Buen equilibrio entre coste y tamano.',
      scoreWarnings: ['Tracking error no disponible'],
      scoreVersion: 'rn-04',
    });
  });

  it('falls back to request ISIN when persisted fund ISIN is missing', async () => {
    fundsRepository.findByIsins.mockResolvedValue(
      new Map([
        [
          'US0000000001',
          {
            id: 'fund-1',
            isin: null,
            name: 'Fondo sin ISIN persistido',
            benchmark: null,
            metrics: { ter: null },
          },
        ],
      ]),
    );
    scoringService.calculateScoreForFundId.mockResolvedValue(null);

    const context = await service.build(
      {
        surface: 'fund-detail',
        message: 'Explicame este producto',
        fund: { isin: 'US0000000001' },
      },
      'general',
    );

    expect(context.fund?.isin).toBe('US0000000001');
    expect(context.fund?.score).toBeNull();
  });

  it('enriches chat context with multiple selected funds', async () => {
    fundsRepository.findByIsins.mockResolvedValue(
      new Map([
        [
          'US78462F1030',
          {
            id: 'fund-1',
            isin: 'US78462F1030',
            name: 'SPDR S&P 500 ETF Trust',
            benchmark: 'S&P 500',
            metrics: { ter: 0.09 },
          },
        ],
        [
          'US46090E1038',
          {
            id: 'fund-2',
            isin: 'US46090E1038',
            name: 'iShares Russell 2000 ETF',
            benchmark: 'Russell 2000',
            metrics: { ter: 0.19 },
          },
        ],
      ]),
    );
    scoringService.calculateScoreForFundId
      .mockResolvedValueOnce({
        score: 88,
        summary: 'Coste bajo.',
        warnings: [],
        version: 'rn-04',
      })
      .mockResolvedValueOnce({
        score: 72,
        summary: 'Mayor coste.',
        warnings: ['Mayor volatilidad esperada'],
        version: 'rn-04',
      });

    const context = await service.build(
      {
        surface: 'compare',
        message: 'Compara estos fondos',
        sessionId: 'session-1',
        funds: [{ isin: 'US78462F1030' }, { isin: 'US46090E1038' }],
      },
      'compare',
    );

    expect(context.sessionId).toBe('session-1');
    expect(context.fund).toBeUndefined();
    expect(context.funds).toHaveLength(2);
    expect(context.funds?.[0]).toMatchObject({
      isin: 'US78462F1030',
      score: 88,
    });
    expect(context.funds?.[1]).toMatchObject({
      isin: 'US46090E1038',
      score: 72,
    });
  });
});

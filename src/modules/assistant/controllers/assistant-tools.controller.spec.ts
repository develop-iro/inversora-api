import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AssistantToolsService } from '../services/assistant-tools.service';
import { AssistantInternalApiKeyGuard } from '../guards/assistant-internal-api-key.guard';
import { AssistantToolsController } from './assistant-tools.controller';

describe('AssistantToolsController', () => {
  let controller: AssistantToolsController;
  let toolsService: {
    getFundSnapshot: jest.Mock;
    getScoreBreakdown: jest.Mock;
    compareFunds: jest.Mock;
    validateComparisonFairness: jest.Mock;
    getGlossaryTerm: jest.Mock;
  };

  beforeEach(async () => {
    toolsService = {
      getFundSnapshot: jest.fn(),
      getScoreBreakdown: jest.fn(),
      compareFunds: jest.fn(),
      validateComparisonFairness: jest.fn(),
      getGlossaryTerm: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssistantToolsController],
      providers: [{ provide: AssistantToolsService, useValue: toolsService }],
    })
      .overrideGuard(AssistantInternalApiKeyGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get(AssistantToolsController);
  });

  it('returns fund snapshots by ISIN', async () => {
    toolsService.getFundSnapshot.mockResolvedValue({ isin: 'US78462F1030' });

    await expect(controller.getFundSnapshot('us78462f1030')).resolves.toEqual({
      isin: 'US78462F1030',
    });
    expect(toolsService.getFundSnapshot).toHaveBeenCalledWith('US78462F1030');
  });

  it('returns score breakdowns by ISIN', async () => {
    toolsService.getScoreBreakdown.mockResolvedValue({
      isin: 'US78462F1030',
      score: 88,
    });

    await expect(controller.getScoreBreakdown('us78462f1030')).resolves.toEqual(
      {
        isin: 'US78462F1030',
        score: 88,
      },
    );
  });

  it('returns compare snapshots', async () => {
    toolsService.compareFunds.mockResolvedValue({
      funds: [{ isin: 'US78462F1030' }],
    });

    await expect(
      controller.compareFunds({ isins: ['us78462f1030'] }),
    ).resolves.toEqual({
      funds: [{ isin: 'US78462F1030' }],
    });
  });

  it('returns comparison fairness results', async () => {
    toolsService.validateComparisonFairness.mockResolvedValue({
      isFair: false,
      warnings: ['benchmarks distintos'],
      funds: [],
    });

    await expect(
      controller.validateComparisonFairness({
        isins: ['US78462F1030', 'US46090E1038'],
      }),
    ).resolves.toEqual({
      isFair: false,
      warnings: ['benchmarks distintos'],
      funds: [],
    });
  });

  it('returns glossary terms', () => {
    toolsService.getGlossaryTerm.mockReturnValue({
      term: 'TER',
      explanation: 'Comision anual total.',
    });

    expect(controller.getGlossaryTerm('ter')).toEqual({
      term: 'TER',
      explanation: 'Comision anual total.',
    });
  });

  it('rejects invalid ISINs', async () => {
    await expect(controller.getFundSnapshot('bad')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

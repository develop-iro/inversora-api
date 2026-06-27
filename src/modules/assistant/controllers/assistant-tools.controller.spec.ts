import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AssistantToolsService } from '../services/assistant-tools.service';
import { AssistantInternalApiKeyGuard } from '../guards/assistant-internal-api-key.guard';
import { AssistantToolsController } from './assistant-tools.controller';

describe('AssistantToolsController', () => {
  let controller: AssistantToolsController;
  let toolsService: { getFundSnapshot: jest.Mock; compareFunds: jest.Mock };

  beforeEach(async () => {
    toolsService = {
      getFundSnapshot: jest.fn(),
      compareFunds: jest.fn(),
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

  it('rejects invalid ISINs', async () => {
    await expect(controller.getFundSnapshot('bad')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

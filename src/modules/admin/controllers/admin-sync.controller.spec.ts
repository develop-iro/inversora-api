import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FundDailySyncService } from '../../funds/services/fund-daily-sync.service';
import { AdminSyncController } from './admin-sync.controller';
import { AdminSyncEnabledGuard } from '../guards/admin-sync-enabled.guard';
import { AdminApiKeyGuard } from '../guards/admin-api-key.guard';

describe('AdminSyncController', () => {
  let controller: AdminSyncController;
  let fundDailySyncService: { runManualSync: jest.Mock };

  beforeEach(async () => {
    fundDailySyncService = {
      runManualSync: jest.fn().mockResolvedValue({
        runId: 'run-1',
        startedAt: '2024-01-01T00:00:00.000Z',
        finishedAt: '2024-01-01T00:00:01.000Z',
        durationMs: 1000,
        steps: {
          metadata: true,
          prices: true,
          composition: true,
          scoring: true,
        },
        total: 1,
        succeeded: 1,
        failed: 0,
        results: [],
        scoring: { status: 'skipped' },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminSyncController],
      providers: [
        {
          provide: FundDailySyncService,
          useValue: fundDailySyncService,
        },
      ],
    })
      .overrideGuard(AdminApiKeyGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminSyncEnabledGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminSyncController>(AdminSyncController);
  });

  it('should run manual sync with default options', async () => {
    await expect(controller.runManualSync({})).resolves.toMatchObject({
      runId: 'run-1',
      total: 1,
    });

    expect(fundDailySyncService.runManualSync).toHaveBeenCalledWith({});
  });

  it('should map request options to manual sync service options', async () => {
    await controller.runManualSync({
      symbols: ['spy'],
      steps: { prices: false },
      incrementalPrices: false,
      historyFrom: '2024-01-01',
      historyTo: '2024-01-31',
    });

    expect(fundDailySyncService.runManualSync).toHaveBeenCalledWith({
      symbols: ['spy'],
      steps: { prices: false },
      incrementalPrices: false,
      historyFrom: '2024-01-01',
      historyTo: '2024-01-31',
    });
  });

  it('should reject invalid request bodies', async () => {
    await expect(
      controller.runManualSync({ historyFrom: 'invalid-date' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AdminSyncController guard wiring', () => {
  it('should register AdminApiKeyGuard on the controller', () => {
    const guards = Reflect.getMetadata('__guards__', AdminSyncController) as
      | unknown[]
      | undefined;

    expect(guards).toContain(AdminApiKeyGuard);
  });

  it('should expose NotFound when admin API is disabled via guard', () => {
    const guard = new AdminApiKeyGuard({
      adminSyncEnabled: false,
      adminCatalogEnabled: false,
      adminApiEnabled: false,
      adminApiKey: 'test-admin-key',
    } as never);

    expect(() => guard.canActivate({} as never)).toThrow(NotFoundException);
  });
});

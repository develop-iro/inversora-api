import { Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import { CronJob } from 'cron';
import { AppConfigService } from '../../../shared/config/config.service';
import { FundSyncScheduler } from './fund-sync.scheduler';
import { FundDailySyncService } from '../services/fund-daily-sync.service';

describe('FundSyncScheduler', () => {
  let scheduler: FundSyncScheduler;
  let config: { syncSchedulerEnabled: boolean; syncCronExpression: string };
  let schedulerRegistry: { addCronJob: jest.Mock };
  let fundDailySyncService: { runDailySync: jest.Mock };
  let registeredJob: CronJob | undefined;

  beforeEach(async () => {
    config = {
      syncSchedulerEnabled: false,
      syncCronExpression: '0 6 * * *',
    };
    schedulerRegistry = {
      addCronJob: jest.fn((_name: string, job: CronJob) => {
        registeredJob = job;
      }),
    };
    fundDailySyncService = {
      runDailySync: jest.fn().mockResolvedValue({
        total: 1,
        succeeded: 1,
        failed: 0,
        results: [],
        scoring: {
          status: 'success',
          total: 1,
          updated: 1,
        },
      }),
    };

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundSyncScheduler,
        {
          provide: AppConfigService,
          useValue: config,
        },
        {
          provide: SchedulerRegistry,
          useValue: schedulerRegistry,
        },
        {
          provide: FundDailySyncService,
          useValue: fundDailySyncService,
        },
      ],
    }).compile();

    scheduler = module.get<FundSyncScheduler>(FundSyncScheduler);
  });

  afterEach(() => {
    registeredJob?.stop();
    registeredJob = undefined;
    jest.restoreAllMocks();
  });

  it('should skip cron registration when scheduler sync is disabled', () => {
    scheduler.onModuleInit();

    expect(schedulerRegistry.addCronJob).not.toHaveBeenCalled();
  });

  it('should register a cron job when scheduler sync is enabled', () => {
    config.syncSchedulerEnabled = true;

    scheduler.onModuleInit();

    expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith(
      'fund-daily-sync',
      expect.any(CronJob),
    );
    expect(registeredJob?.isActive).toBe(true);
  });

  it('should delegate scheduled runs to the daily sync service', async () => {
    await scheduler.runScheduledSync();

    expect(fundDailySyncService.runDailySync).toHaveBeenCalled();
  });

  it('should log errors without rethrowing when the daily sync fails', async () => {
    fundDailySyncService.runDailySync.mockRejectedValueOnce(
      new Error('Sync failed'),
    );

    await expect(scheduler.runScheduledSync()).resolves.toBeUndefined();
  });
});

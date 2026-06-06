import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { AppConfigService } from '../../../shared/config/config.service';
import { FundDailySyncService } from '../services/fund-daily-sync.service';

const FUND_DAILY_SYNC_JOB = 'fund-daily-sync';

/**
 * Registers and runs the daily fund synchronization cron job.
 */
@Injectable()
export class FundSyncScheduler implements OnModuleInit {
  private readonly logger = new Logger(FundSyncScheduler.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly fundDailySyncService: FundDailySyncService,
  ) {}

  /**
   * Registers the cron job when scheduler sync is enabled in configuration.
   */
  onModuleInit(): void {
    if (!this.config.syncSchedulerEnabled) {
      this.logger.log('Fund sync scheduler is disabled');
      return;
    }

    const job = new CronJob(this.config.syncCronExpression, () => {
      void this.runScheduledSync();
    });

    this.schedulerRegistry.addCronJob(FUND_DAILY_SYNC_JOB, job);
    job.start();

    this.logger.log(
      `Fund sync scheduler registered (${this.config.syncCronExpression})`,
    );
  }

  /**
   * Executes the daily synchronization workflow.
   */
  async runScheduledSync(): Promise<void> {
    this.logger.log('Starting scheduled fund synchronization');

    try {
      const result = await this.fundDailySyncService.runDailySync();

      this.logger.log(
        `Scheduled fund synchronization finished: ${result.succeeded}/${result.total} succeeded`,
      );
    } catch (error: unknown) {
      this.logger.error(
        'Scheduled fund synchronization failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

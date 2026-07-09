import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { BffModule } from './modules/bff/bff.module';
import { FundsModule } from './modules/funds/funds.module';
import { HealthModule } from './modules/health/health.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { AppConfigModule } from './shared/config/config.module';
import { PrismaModule } from './shared/database/prisma.module';
import { CoreApiModule } from './core/api/core-api.module';
import { HttpClientModule } from './shared/http/http-client.module';
import { IpThrottlerGuard } from './shared/http/ip-throttler.guard';
import { AppThrottlerModule } from './shared/http/throttler.config';

@Module({
  imports: [
    AppConfigModule,
    AppThrottlerModule,
    ScheduleModule.forRoot(),
    HttpClientModule,
    CoreApiModule,
    PrismaModule,
    ProvidersModule,
    FundsModule,
    BffModule,
    AdminModule,
    AnalyticsModule,
    ScoringModule,
    AssistantModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: IpThrottlerGuard,
    },
  ],
})
export class AppModule {}

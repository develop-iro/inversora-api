import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule } from './modules/admin/admin.module';
import { BffModule } from './modules/bff/bff.module';
import { FundsModule } from './modules/funds/funds.module';
import { HealthModule } from './modules/health/health.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { AppConfigModule } from './shared/config/config.module';
import { PrismaModule } from './shared/database/prisma.module';
import { HttpClientModule } from './shared/http/http-client.module';

@Module({
  imports: [
    AppConfigModule,
    ScheduleModule.forRoot(),
    HttpClientModule,
    PrismaModule,
    ProvidersModule,
    FundsModule,
    BffModule,
    AdminModule,
    ScoringModule,
    HealthModule,
  ],
})
export class AppModule {}

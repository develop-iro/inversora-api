import { Module } from '@nestjs/common';
import { FundsModule } from './modules/funds/funds.module';
import { HealthModule } from './modules/health/health.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { AppConfigModule } from './shared/config/config.module';
import { PrismaModule } from './shared/database/prisma.module';
import { HttpClientModule } from './shared/http/http-client.module';

@Module({
  imports: [
    AppConfigModule,
    HttpClientModule,
    PrismaModule,
    ProvidersModule,
    FundsModule,
    HealthModule,
  ],
})
export class AppModule {}

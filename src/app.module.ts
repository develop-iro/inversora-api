import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module';
import { AppConfigModule } from './shared/config/config.module';
import { PrismaModule } from './shared/database/prisma.module';
import { HttpClientModule } from './shared/http/http-client.module';

@Module({
  imports: [AppConfigModule, HttpClientModule, PrismaModule, HealthModule],
})
export class AppModule {}

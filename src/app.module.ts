import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module';
import { AppConfigModule } from './shared/config/config.module';
import { PrismaModule } from './shared/database/prisma.module';

@Module({
  imports: [AppConfigModule, PrismaModule, HealthModule],
})
export class AppModule {}

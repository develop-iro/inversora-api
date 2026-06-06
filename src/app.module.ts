import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './shared/database/prisma.module';

@Module({
  imports: [PrismaModule, HealthModule],
})
export class AppModule {}

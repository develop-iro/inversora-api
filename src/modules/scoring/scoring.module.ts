import { Module } from '@nestjs/common';
import { FundsModule } from '../funds/funds.module';
import { ScoringController } from './controllers/scoring.controller';
import { ScoringService } from './services/scoring.service';

/**
 * Domain module for the Invesora Score algorithm.
 */
@Module({
  imports: [FundsModule],
  controllers: [ScoringController],
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}

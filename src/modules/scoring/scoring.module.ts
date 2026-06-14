import { Module, forwardRef } from '@nestjs/common';
import { FundsModule } from '../funds/funds.module';
import { RankingsController } from './controllers/rankings.controller';
import { ScoringController } from './controllers/scoring.controller';
import { RankingsService } from './services/rankings.service';
import { ScoringService } from './services/scoring.service';

/**
 * Domain module for the Invesora Score algorithm.
 */
@Module({
  imports: [forwardRef(() => FundsModule)],
  controllers: [ScoringController, RankingsController],
  providers: [ScoringService, RankingsService],
  exports: [ScoringService, RankingsService],
})
export class ScoringModule {}

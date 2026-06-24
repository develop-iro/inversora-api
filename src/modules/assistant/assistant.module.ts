import { Module } from '@nestjs/common';

import { FundsModule } from '../funds/funds.module';
import { ScoringModule } from '../scoring/scoring.module';
import { AssistantController } from './controllers/assistant.controller';
import { AssistantCacheRepository } from './repositories/assistant-cache.repository';
import { AssistantContextBuilderService } from './services/assistant-context.builder';
import { AssistantOutputGuardrailsService } from './services/assistant-output.guardrails';
import { AssistantService } from './services/assistant.service';
import { GlossaryService } from './services/glossary.service';
import { IntentClassifierService } from './services/intent-classifier.service';
import { OpenAiAssistantService } from './services/openai-assistant.service';

/**
 * SORA educational assistant module (OpenAI + glossary + PostgreSQL cache).
 */
@Module({
  imports: [FundsModule, ScoringModule],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    IntentClassifierService,
    GlossaryService,
    AssistantCacheRepository,
    AssistantContextBuilderService,
    OpenAiAssistantService,
    AssistantOutputGuardrailsService,
  ],
  exports: [AssistantService],
})
export class AssistantModule {}

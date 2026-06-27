import { Module } from '@nestjs/common';

import { FundsModule } from '../funds/funds.module';
import { ScoringModule } from '../scoring/scoring.module';
import { AssistantController } from './controllers/assistant.controller';
import { AssistantToolsController } from './controllers/assistant-tools.controller';
import { AssistantInternalApiKeyGuard } from './guards/assistant-internal-api-key.guard';
import { AssistantRateLimitGuard } from './guards/assistant-rate-limit.guard';
import { AssistantCacheRepository } from './repositories/assistant-cache.repository';
import { AssistantConversationRepository } from './repositories/assistant-conversation.repository';
import { AssistantContextBuilderService } from './services/assistant-context.builder';
import { AssistantOutputGuardrailsService } from './services/assistant-output.guardrails';
import { AssistantService } from './services/assistant.service';
import { AssistantToolsService } from './services/assistant-tools.service';
import { GlossaryService } from './services/glossary.service';
import { IntentClassifierService } from './services/intent-classifier.service';
import { OpenAiAssistantService } from './services/openai-assistant.service';
import { PythonAgentAssistantService } from './services/python-agent-assistant.service';

/**
 * SORA educational assistant module (OpenAI + glossary + PostgreSQL cache).
 */
@Module({
  imports: [FundsModule, ScoringModule],
  controllers: [AssistantController, AssistantToolsController],
  providers: [
    AssistantService,
    AssistantToolsService,
    AssistantInternalApiKeyGuard,
    AssistantRateLimitGuard,
    IntentClassifierService,
    GlossaryService,
    AssistantCacheRepository,
    AssistantConversationRepository,
    AssistantContextBuilderService,
    OpenAiAssistantService,
    PythonAgentAssistantService,
    AssistantOutputGuardrailsService,
  ],
  exports: [AssistantService],
})
export class AssistantModule {}

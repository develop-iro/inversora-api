import { Module } from '@nestjs/common';

import { AnonymousDevicesModule } from '../anonymous-devices/anonymous-devices.module';
import { FundsModule } from '../funds/funds.module';
import { ScoringModule } from '../scoring/scoring.module';
import { AssistantController } from './controllers/assistant.controller';
import { AssistantToolsController } from './controllers/assistant-tools.controller';
import { AssistantInternalApiKeyGuard } from './guards/assistant-internal-api-key.guard';
import { AssistantCacheRepository } from './repositories/assistant-cache.repository';
import { AssistantConversationRepository } from './repositories/assistant-conversation.repository';
import { AssistantLlmUsageRepository } from './repositories/assistant-llm-usage.repository';
import { AssistantConfidenceService } from './services/assistant-confidence.service';
import { AssistantContextBuilderService } from './services/assistant-context.builder';
import { AssistantLlmOrchestratorService } from './services/assistant-llm-orchestrator.service';
import { AssistantLlmUsageService } from './services/assistant-llm-usage.service';
import { AssistantOutputGuardrailsService } from './services/assistant-output.guardrails';
import { AssistantRagService } from './services/assistant-rag.service';
import { AssistantService } from './services/assistant.service';
import { AssistantToolsService } from './services/assistant-tools.service';
import { DeterministicAssistantService } from './services/deterministic-assistant.service';
import { GlossaryService } from './services/glossary.service';
import { IntentClassifierService } from './services/intent-classifier.service';
import { LlmChatCompletionService } from './services/llm-chat-completion.service';
import { OpenAiAssistantService } from './services/openai-assistant.service';
import { PythonAgentAssistantService } from './services/python-agent-assistant.service';

/**
 * SORA educational assistant module (layered rules, RAG, Qwen primary, OpenAI fallback).
 */
@Module({
  imports: [FundsModule, ScoringModule, AnonymousDevicesModule],
  controllers: [AssistantController, AssistantToolsController],
  providers: [
    AssistantService,
    AssistantToolsService,
    AssistantInternalApiKeyGuard,
    IntentClassifierService,
    GlossaryService,
    AssistantCacheRepository,
    AssistantConversationRepository,
    AssistantLlmUsageRepository,
    AssistantContextBuilderService,
    DeterministicAssistantService,
    AssistantRagService,
    LlmChatCompletionService,
    AssistantConfidenceService,
    AssistantLlmUsageService,
    AssistantLlmOrchestratorService,
    OpenAiAssistantService,
    PythonAgentAssistantService,
    AssistantOutputGuardrailsService,
  ],
  exports: [AssistantService],
})
export class AssistantModule {}

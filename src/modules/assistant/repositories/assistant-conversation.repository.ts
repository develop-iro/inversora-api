import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/database/prisma.service';
import type {
  AssistantChatResponse,
  AssistantIntent,
  AssistantSurface,
} from '../entities/assistant-context.schema';

type AssistantConversationRecord = {
  id: string;
  sessionId: string;
  deviceId: string | null;
};

type AssistantMessageRecord = {
  role: 'user' | 'assistant';
  content: string;
  intent: AssistantIntent | null;
  createdAt: Date;
};

type AssistantConversationDelegate = {
  upsert(input: {
    where: { sessionId: string };
    create: {
      sessionId: string;
      deviceId?: string;
      surface: AssistantSurface;
      locale: string;
      lastMessageAt: Date;
    };
    update: {
      deviceId?: string;
      surface: AssistantSurface;
      locale: string;
      lastMessageAt: Date;
    };
  }): Promise<AssistantConversationRecord>;
  findUnique(input: {
    where: { sessionId: string };
    include?: {
      messages?: {
        orderBy: { createdAt: 'desc' };
        take: number;
        select: {
          role: true;
          content: true;
          intent: true;
          createdAt: true;
        };
      };
    };
    select?: { deviceId: true };
  }): Promise<
    | (Partial<AssistantConversationRecord> & {
        messages?: AssistantMessageRecord[];
      })
    | null
  >;
};

type AssistantMessageDelegate = {
  create(input: {
    data: {
      conversationId: string;
      role: 'user' | 'assistant';
      content: string;
      intent?: AssistantIntent;
      source?: string;
      runtime?: string;
      promptVersion?: string;
      relatedFundIsins?: readonly string[];
      metadataJson?: Record<string, unknown>;
    };
  }): Promise<unknown>;
};

type AssistantConversationPrismaClient = {
  assistantConversation: AssistantConversationDelegate;
  assistantMessage: AssistantMessageDelegate;
};

/** Input for persisting one assistant chat turn. */
export type SaveAssistantChatTurnInput = {
  sessionId: string;
  surface: AssistantSurface;
  locale: string;
  userMessage: string;
  intent: AssistantIntent;
  response: AssistantChatResponse;
  runtime: string;
  relatedFundIsins: readonly string[];
  deviceId?: string;
};

/** Recent chat message projected into the assistant prompt context. */
export type AssistantRecentMessage = {
  role: 'user' | 'assistant';
  content: string;
  intent?: AssistantIntent;
  createdAt: string;
};

/**
 * PostgreSQL persistence for SORA chat conversations and messages.
 */
@Injectable()
export class AssistantConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Loads the latest messages for a session in chronological order.
   *
   * @param sessionId - Stable SORA session id.
   * @param limit - Maximum number of messages to return.
   */
  async findRecentMessages(
    sessionId: string,
    limit: number,
  ): Promise<readonly AssistantRecentMessage[]> {
    if (limit <= 0) {
      return [];
    }

    const prisma = this.prisma as unknown as AssistantConversationPrismaClient;
    const conversation = await prisma.assistantConversation.findUnique({
      where: { sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            role: true,
            content: true,
            intent: true,
            createdAt: true,
          },
        },
      },
    });

    if (conversation === null) {
      return [];
    }

    return [...(conversation.messages ?? [])]
      .reverse()
      .map((message): AssistantRecentMessage => ({
        role: message.role,
        content: message.content,
        intent: message.intent ?? undefined,
        createdAt: message.createdAt.toISOString(),
      }));
  }

  /**
   * Returns the device currently bound to a conversation, if any.
   */
  async findDeviceIdBySessionId(sessionId: string): Promise<string | null> {
    const prisma = this.prisma as unknown as AssistantConversationPrismaClient;
    const conversation = await prisma.assistantConversation.findUnique({
      where: { sessionId },
      select: { deviceId: true },
    });

    return conversation?.deviceId ?? null;
  }

  /**
   * Persists a user/assistant turn under a stable session id.
   *
   * @param input - Chat turn payload.
   */
  async saveTurn(input: SaveAssistantChatTurnInput): Promise<void> {
    const now = new Date();
    const prisma = this.prisma as unknown as AssistantConversationPrismaClient;
    const conversation = await prisma.assistantConversation.upsert({
      where: { sessionId: input.sessionId },
      create: {
        sessionId: input.sessionId,
        ...(input.deviceId !== undefined ? { deviceId: input.deviceId } : {}),
        surface: input.surface,
        locale: input.locale,
        lastMessageAt: now,
      },
      update: {
        ...(input.deviceId !== undefined ? { deviceId: input.deviceId } : {}),
        surface: input.surface,
        locale: input.locale,
        lastMessageAt: now,
      },
    });

    await prisma.assistantMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: input.userMessage,
        intent: input.intent,
        runtime: input.runtime,
        relatedFundIsins: input.relatedFundIsins,
      },
    });

    await prisma.assistantMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: input.response.text,
        intent: input.intent,
        source: input.response.source,
        runtime: input.runtime,
        promptVersion: input.response.promptVersion,
        relatedFundIsins: input.relatedFundIsins,
        metadataJson: {
          title: input.response.title,
          cached: input.response.cached,
          disclaimer: input.response.disclaimer,
        },
      },
    });
  }
}

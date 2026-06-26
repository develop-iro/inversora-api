import { PrismaService } from '../../../shared/database/prisma.service';
import { AssistantConversationRepository } from './assistant-conversation.repository';

type ConversationUpsertInput = {
  where: { sessionId: string };
  create: {
    sessionId: string;
    surface: string;
    locale: string;
    lastMessageAt: Date;
  };
  update: {
    surface: string;
    locale: string;
    lastMessageAt: Date;
  };
};

type ConversationFindUniqueInput = {
  where: { sessionId: string };
  include: {
    messages: {
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
};

type MessageCreateInput = {
  data: {
    conversationId: string;
    role: string;
    content: string;
    intent?: string;
    source?: string;
    runtime?: string;
    promptVersion?: string;
    relatedFundIsins?: readonly string[];
    metadataJson?: Record<string, unknown>;
  };
};

describe('AssistantConversationRepository', () => {
  let repository: AssistantConversationRepository;
  let prisma: {
    assistantConversation: {
      upsert: jest.Mock<
        Promise<{ id: string; sessionId: string }>,
        [ConversationUpsertInput]
      >;
      findUnique: jest.Mock<
        Promise<{
          id: string;
          sessionId: string;
          messages: Array<{
            role: 'user' | 'assistant';
            content: string;
            intent: 'compare' | null;
            createdAt: Date;
          }>;
        } | null>,
        [ConversationFindUniqueInput]
      >;
    };
    assistantMessage: {
      create: jest.Mock<Promise<unknown>, [MessageCreateInput]>;
    };
  };

  beforeEach(() => {
    prisma = {
      assistantConversation: {
        upsert: jest
          .fn<
            Promise<{ id: string; sessionId: string }>,
            [ConversationUpsertInput]
          >()
          .mockResolvedValue({
            id: 'conversation-1',
            sessionId: 'session-1',
          }),
        findUnique: jest.fn<
          Promise<{
            id: string;
            sessionId: string;
            messages: Array<{
              role: 'user' | 'assistant';
              content: string;
              intent: 'compare' | null;
              createdAt: Date;
            }>;
          } | null>,
          [ConversationFindUniqueInput]
        >(),
      },
      assistantMessage: {
        create: jest.fn<Promise<unknown>, [MessageCreateInput]>(),
      },
    };

    repository = new AssistantConversationRepository(
      prisma as unknown as PrismaService,
    );
  });

  it('upserts the conversation and persists both chat messages', async () => {
    await repository.saveTurn({
      sessionId: 'session-1',
      surface: 'compare',
      locale: 'es',
      userMessage: 'Compara estos fondos',
      intent: 'compare',
      runtime: 'python-agent',
      relatedFundIsins: ['US78462F1030', 'US46090E1038'],
      response: {
        text: 'Comparacion educativa.',
        title: 'Cómo comparar fondos en Inversora',
        source: 'openai',
        cached: false,
        disclaimer: 'Disclaimer',
        promptVersion: 'sora-v1',
        sessionId: 'session-1',
      },
    });

    const upsertInput: unknown =
      prisma.assistantConversation.upsert.mock.calls[0]?.[0];

    expect(upsertInput).toMatchObject({
      where: { sessionId: 'session-1' },
      create: {
        sessionId: 'session-1',
        surface: 'compare',
        locale: 'es',
      },
    });
    expect(prisma.assistantMessage.create).toHaveBeenCalledTimes(2);
    const firstMessageInput: unknown =
      prisma.assistantMessage.create.mock.calls[0]?.[0];
    const secondMessageInput: unknown =
      prisma.assistantMessage.create.mock.calls[1]?.[0];

    expect(firstMessageInput).toMatchObject({
      data: {
        conversationId: 'conversation-1',
        role: 'user',
        content: 'Compara estos fondos',
        intent: 'compare',
        runtime: 'python-agent',
        relatedFundIsins: ['US78462F1030', 'US46090E1038'],
      },
    });
    expect(secondMessageInput).toMatchObject({
      data: {
        conversationId: 'conversation-1',
        role: 'assistant',
        content: 'Comparacion educativa.',
        source: 'openai',
        promptVersion: 'sora-v1',
      },
    });
  });

  it('returns an empty list when limit is zero or negative', async () => {
    await expect(
      repository.findRecentMessages('session-1', 0),
    ).resolves.toEqual([]);
    await expect(
      repository.findRecentMessages('session-1', -1),
    ).resolves.toEqual([]);
    expect(prisma.assistantConversation.findUnique).not.toHaveBeenCalled();
  });

  it('returns an empty list when the session does not exist', async () => {
    prisma.assistantConversation.findUnique.mockResolvedValue(null);

    await expect(
      repository.findRecentMessages('missing-session', 5),
    ).resolves.toEqual([]);
  });

  it('returns recent messages in chronological order', async () => {
    prisma.assistantConversation.findUnique.mockResolvedValue({
      id: 'conversation-1',
      sessionId: 'session-1',
      messages: [
        {
          role: 'assistant',
          content: 'Respuesta previa.',
          intent: null,
          createdAt: new Date('2026-06-25T08:00:02.000Z'),
        },
        {
          role: 'user',
          content: 'Pregunta previa.',
          intent: 'compare',
          createdAt: new Date('2026-06-25T08:00:01.000Z'),
        },
      ],
    });

    await expect(
      repository.findRecentMessages('session-1', 2),
    ).resolves.toEqual([
      {
        role: 'user',
        content: 'Pregunta previa.',
        intent: 'compare',
        createdAt: '2026-06-25T08:00:01.000Z',
      },
      {
        role: 'assistant',
        content: 'Respuesta previa.',
        createdAt: '2026-06-25T08:00:02.000Z',
      },
    ]);
    expect(prisma.assistantConversation.findUnique).toHaveBeenCalledWith({
      where: { sessionId: 'session-1' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 2,
          select: {
            role: true,
            content: true,
            intent: true,
            createdAt: true,
          },
        },
      },
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';

import { AssistantRagService } from './assistant-rag.service';

describe('AssistantRagService', () => {
  let service: AssistantRagService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssistantRagService],
    }).compile();

    service = module.get(AssistantRagService);
  });

  it('retrieves TER-related chunks for commission questions', () => {
    const result = service.retrieve(
      'Que es el TER y las comisiones',
      'explain_term',
    );

    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.chunks.some((chunk) => chunk.topic === 'comisiones')).toBe(
      true,
    );
  });

  it('formats chunks for prompt grounding', () => {
    const { chunks } = service.retrieve(
      'score inversora ranking',
      'explain_score',
    );
    const formatted = service.formatChunksForPrompt(chunks);

    expect(formatted).toContain('[Doc 1');
    expect(formatted).toContain('Score Inversora');
  });

  it('returns empty prompt text when no chunks are available', () => {
    expect(service.formatChunksForPrompt([])).toBe(
      'Sin fragmentos documentales adicionales.',
    );
  });

  it('biases compare intent toward comparison chunks', () => {
    const result = service.retrieve('comparar fondos similares', 'compare');

    expect(result.chunks.some((chunk) => chunk.topic === 'comparacion')).toBe(
      true,
    );
  });

  it('supports glossary intent retrieval', () => {
    const result = service.retrieve('glosario ter comisiones', 'glossary');

    expect(result.chunks.length).toBeGreaterThan(0);
  });

  it('returns no chunks for unrelated general queries', () => {
    const result = service.retrieve('hola', 'general');

    expect(result.chunks).toEqual([]);
  });
});

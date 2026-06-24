import {
  buildAssistantCacheKey,
  normalizeAssistantQuery,
} from '../entities/assistant-cache.utils';

describe('assistant cache utils', () => {
  it('normalizes accents and casing', () => {
    expect(normalizeAssistantQuery('  ¿Qué es el TER?  ')).toBe(
      '¿que es el ter?',
    );
  });

  it('builds stable cache keys', () => {
    const keyA = buildAssistantCacheKey({
      intent: 'general',
      normalizedQuery: 'que es msci world',
      scoreVersion: 'rn-04',
      promptVersion: 'sora-v1',
      locale: 'es',
    });
    const keyB = buildAssistantCacheKey({
      intent: 'general',
      normalizedQuery: 'que es msci world',
      scoreVersion: 'rn-04',
      promptVersion: 'sora-v1',
      locale: 'es',
    });

    expect(keyA).toBe(keyB);
    expect(keyA).toHaveLength(64);
  });
});

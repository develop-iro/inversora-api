import {
  buildAssistantCacheKey,
  computeAssistantCacheExpiry,
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

  it('includes fund ISIN in cache keys when provided', () => {
    const withFund = buildAssistantCacheKey({
      intent: 'explain_score',
      normalizedQuery: 'score',
      fundIsin: 'US78462F1030',
      scoreVersion: 'rn-04',
      promptVersion: 'sora-v1',
      locale: 'es',
    });
    const withoutFund = buildAssistantCacheKey({
      intent: 'explain_score',
      normalizedQuery: 'score',
      scoreVersion: 'rn-04',
      promptVersion: 'sora-v1',
      locale: 'es',
    });

    expect(withFund).not.toBe(withoutFund);
  });

  it('computes cache expiry from TTL days', () => {
    const expiresAt = computeAssistantCacheExpiry(90);
    const expected = new Date();
    expected.setUTCDate(expected.getUTCDate() + 90);

    expect(expiresAt.getUTCDate()).toBe(expected.getUTCDate());
  });
});

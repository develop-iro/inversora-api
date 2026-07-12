import { buildAssistantUserPrompt } from './assistant-system-prompt';

describe('buildAssistantUserPrompt', () => {
  it('builds the user prompt with factual context only', () => {
    const prompt = buildAssistantUserPrompt(
      'Que es el TER?',
      'explain_term',
      '{"fund":{"isin":"IE00B4L5Y983"}}',
    );

    expect(prompt).toContain('Intención detectada: explain_term');
    expect(prompt).toContain('Pregunta del usuario: Que es el TER?');
    expect(prompt).toContain('Contexto factual del fondo');
    expect(prompt).not.toContain('Fragmentos documentales');
  });

  it('includes RAG context when provided', () => {
    const prompt = buildAssistantUserPrompt(
      'Que es el TER?',
      'explain_term',
      '{"fund":{"isin":"IE00B4L5Y983"}}',
      'TER = Total Expense Ratio',
    );

    expect(prompt).toContain('Fragmentos documentales educativos');
    expect(prompt).toContain('TER = Total Expense Ratio');
  });

  it('ignores empty RAG context', () => {
    const prompt = buildAssistantUserPrompt(
      'Que es el TER?',
      'explain_term',
      '{"fund":{"isin":"IE00B4L5Y983"}}',
      '   ',
    );

    expect(prompt).not.toContain('Fragmentos documentales');
  });
});

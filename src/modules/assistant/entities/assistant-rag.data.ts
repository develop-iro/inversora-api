import { z } from 'zod';

/** Metadata for a RAG document chunk. */
export const assistantRagChunkSchema = z.object({
  id: z.string().min(1),
  topic: z.string().min(1),
  sourceFile: z.string().min(1),
  locale: z.literal('es'),
  content: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(1),
});

export type AssistantRagChunk = z.infer<typeof assistantRagChunkSchema>;

/** Curated educational chunks aligned to product documentation. */
export const ASSISTANT_RAG_CHUNKS: readonly AssistantRagChunk[] = [
  {
    id: 'vision-educate-first',
    topic: 'principios',
    sourceFile: 'invesora/docs/product/vision-and-principles.md',
    locale: 'es',
    keywords: ['educar', 'principio', 'comparar', 'aprender', 'contexto'],
    content:
      'Inversora educa primero y compara después. La información es orientativa y no sustituye asesoramiento personalizado. No ejecuta inversiones ni conecta con brokers.',
  },
  {
    id: 'score-multidimensional',
    topic: 'scoring',
    sourceFile: 'inversora-api/docs/scoring-rn-04.md',
    locale: 'es',
    keywords: ['score', 'ranking', 'puntuacion', 'criterio', 'rn-04'],
    content:
      'El Score Inversora es multidimensional: comisiones (TER), tracking error, tamaño (AUM), antigüedad del fondo, benchmark y calidad de datos. No ordena solo por rentabilidad pasada.',
  },
  {
    id: 'ter-glossary',
    topic: 'comisiones',
    sourceFile: 'assistant-glossary',
    locale: 'es',
    keywords: ['ter', 'comision', 'comisiones', 'gasto', 'coste'],
    content:
      'El TER (Total Expense Ratio) resume los costes anuales totales del fondo. Comisiones más bajas suelen dejar más rentabilidad neta a largo plazo, aunque no son el único factor.',
  },
  {
    id: 'tracking-error',
    topic: 'metricas',
    sourceFile: 'assistant-glossary',
    locale: 'es',
    keywords: ['tracking', 'error', 'seguimiento', 'indice', 'benchmark'],
    content:
      'El tracking error mide cuánto se desvía el fondo de su índice de referencia. Un tracking error bajo suele indicar mejor réplica del benchmark, salvo avisos de calidad de datos.',
  },
  {
    id: 'past-performance',
    topic: 'riesgo',
    sourceFile: 'invesora/docs/product/legal-and-disclaimers.md',
    locale: 'es',
    keywords: ['rentabilidad', 'pasada', 'historica', 'futuro', 'riesgo'],
    content:
      'La rentabilidad pasada no garantiza resultados futuros. Comparar fondos solo por históricos recientes es un error frecuente entre principiantes.',
  },
  {
    id: 'assistant-limits',
    topic: 'asistente',
    sourceFile: 'invesora/docs/product/assistant.md',
    locale: 'es',
    keywords: ['sora', 'asistente', 'ia', 'recomendacion', 'comprar', 'vender'],
    content:
      'El Asistente Inversora explica conceptos y datos existentes. No modifica rankings, no inventa métricas y no recomienda comprar o vender fondos.',
  },
  {
    id: 'index-fund-basics',
    topic: 'conceptos',
    sourceFile: 'invesora/docs/product/problem-statement.md',
    locale: 'es',
    keywords: ['fondo', 'indexado', 'indice', 'etf', 'pasivo'],
    content:
      'Un fondo indexado replica un índice con reglas claras. Busca seguir al mercado de referencia con costes contenidos en lugar de batirlo activamente cada trimestre.',
  },
  {
    id: 'compare-fairness',
    topic: 'comparacion',
    sourceFile: 'invesora/docs/product/objectives.md',
    locale: 'es',
    keywords: [
      'comparar',
      'comparacion',
      'homogeneo',
      'categoria',
      'benchmark',
    ],
    content:
      'Compara fondos con benchmark o categoría homogénea. Mezclar fondos de distinta referencia puede llevar a conclusiones engañosas.',
  },
];

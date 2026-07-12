import type { InvestmentNewsItem } from '../entities/investment-news.schema';

/**
 * Curated educational headlines used as a fallback for the home news section
 * when live market news from the provider is unavailable.
 */
export const CURATED_INVESTMENT_NEWS: readonly InvestmentNewsItem[] = [
  {
    id: 'news-ter-basics',
    title: 'Qué es el TER y por qué importa en un fondo indexado',
    summary:
      'La comisión anual total reduce el rendimiento neto. Comparar TER dentro de la misma categoría ayuda a entender costes, no a predecir resultados.',
    source: 'Inversora Educa',
    publishedAt: '2026-06-20',
    category: 'concepto',
  },
  {
    id: 'news-tracking-error',
    title: 'Tracking error: la métrica que mide lo fiel que es un fondo',
    summary:
      'Un tracking error bajo suele indicar que el fondo replica bien su índice. Conviene interpretarlo junto al TER y la antigüedad del producto.',
    source: 'Inversora Educa',
    publishedAt: '2026-06-18',
    category: 'concepto',
  },
  {
    id: 'news-ecb-context',
    title: 'Tipos de interés estables: contexto para inversores pacientes',
    summary:
      'Los movimientos de tipos afectan al entorno, pero un horizonte largo y una cartera diversificada siguen siendo ideas educativas habituales en indexación.',
    source: 'Contexto de mercado',
    publishedAt: '2026-06-15',
    category: 'mercado',
  },
  {
    id: 'news-mifid-reminder',
    title: 'Recordatorio: información educativa, no asesoramiento',
    summary:
      'Las herramientas de Inversora explican conceptos y comparan datos públicos. No sustituyen el criterio personal ni el consejo profesional.',
    source: 'Aviso legal',
    publishedAt: '2026-06-10',
    category: 'regulacion',
  },
] as const;

/** Glossary entry for static SORA terminology responses. */
export type GlossaryEntry = {
  readonly term: string;
  readonly explanation: string;
  readonly keywords: readonly string[];
};

/**
 * Static educational glossary for beginner questions.
 *
 * Covers fund metrics (aligned with the mobile FUND_GLOSSARY), curriculum
 * concepts from `/learn`, and the conceptual prompts SORA suggests in-app.
 */
export const ASSISTANT_GLOSSARY: readonly GlossaryEntry[] = [
  {
    term: 'Fondo indexado',
    explanation:
      'Un fondo indexado replica un índice de mercado (por ejemplo, el IBEX 35 o el S&P 500) con reglas claras. No busca batir al mercado cada trimestre: intenta seguirlo con la menor desviación y coste posibles.',
    keywords: [
      'fondo indexado',
      'fondos indexados',
      'indexacion',
      'gestion pasiva',
      'gestion indexada',
    ],
  },
  {
    term: 'ETF y fondo indexado',
    explanation:
      'Ambos pueden seguir un índice. Un ETF cotiza en bolsa como una acción durante la sesión; un fondo indexado tradicional suele suscribirse al valor liquidativo. En Inversora el foco educativo son fondos indexados comparables, no ejecutar operaciones.',
    keywords: [
      'etf y fondo indexado',
      'diferencia entre etf y fondo',
      'diferencia entre etf',
      'etf y fondo',
      'fondo o etf',
      'etf',
    ],
  },
  {
    term: 'Índice de mercado',
    explanation:
      'Un índice agrupa valores con reglas públicas (por ejemplo, las mayores empresas de un país o región). Sirve de referencia: el fondo indexado intenta copiar ese conjunto, no elegir valores uno a uno.',
    keywords: [
      'indice de mercado',
      'que es un indice',
      'que es el indice',
      'indices bursatiles',
    ],
  },
  {
    term: 'Diversificación',
    explanation:
      'Consiste en repartir el riesgo entre muchos activos, sectores o regiones. Un fondo indexado amplio ya diversifica dentro de su índice, aunque sigue expuesto al riesgo de mercado.',
    keywords: ['diversificacion', 'diversificar', 'repartir el riesgo'],
  },
  {
    term: 'Ahorrar e invertir',
    explanation:
      'Ahorrar conserva liquidez para imprevistos. Invertir busca crecimiento a largo plazo, pero el valor puede bajar temporalmente. Conviene tener un colchón de emergencia antes de asumir más riesgo.',
    keywords: [
      'ahorrar e invertir',
      'ahorrar o invertir',
      'ahorro e inversion',
      'diferencia entre ahorrar',
    ],
  },
  {
    term: 'Horizonte temporal',
    explanation:
      'Es el tiempo que puedes dejar el dinero invertido sin necesitarlo. A horizontes más largos suele haber más margen para recuperar caídas temporales, pero nunca hay garantías.',
    keywords: [
      'horizonte temporal',
      'horizonte de inversion',
      'largo plazo',
      'plazo de inversion',
      'invertir a largo plazo',
    ],
  },
  {
    term: 'Interés compuesto',
    explanation:
      'Reinvertir las ganancias hace que el capital base pueda crecer con el tiempo. Es un concepto educativo: la calculadora de Inversora muestra escenarios ilustrativos, no predicciones ni promesas de rentabilidad.',
    keywords: [
      'interes compuesto',
      'capitalizacion compuesta',
      'reinvertir ganancias',
    ],
  },
  {
    term: 'Riesgo al invertir',
    explanation:
      'Asumir riesgo significa aceptar que el valor puede subir o bajar. La volatilidad son esas oscilaciones normales. Más plazo no elimina el riesgo, aunque puede dar más margen para recuperarse; no hay garantías.',
    keywords: [
      'asumir riesgo',
      'que es el riesgo',
      'que significa el riesgo',
      'riesgo al invertir',
      'riesgo de inversion',
    ],
  },
  {
    term: 'Perfil orientativo',
    explanation:
      'El cuestionario educativo resume horizonte, tolerancia al riesgo y objetivos de aprendizaje. Es orientativo: no sustituye un test de idoneidad ni asesoramiento personalizado.',
    keywords: [
      'perfil orientativo',
      'perfil inversor',
      'cuestionario educativo',
      'perfil educativo',
    ],
  },
  {
    term: 'Categorías de fondos',
    explanation:
      'Las categorías agrupan fondos con exposición similar (por región, tipo de activo o estilo). Filtra por categoría para comparar de forma más homogénea: mezclar categorías distintas puede llevar a conclusiones engañosas.',
    keywords: [
      'categorias de fondos',
      'categoria de fondos',
      'filtrar fondos',
      'filtrar por categoria',
      'diferencia entre categorias',
      'diferencia hay entre categorias',
      'tipos de fondos',
    ],
  },
  {
    term: 'Cómo comparar fondos',
    explanation:
      'Compara fondos de la misma categoría o benchmark cuando sea posible. Mira TER, Score Inversora, tracking error y riesgo. La comparación es educativa: no indica cuál debes contratar.',
    keywords: [
      'como comparar',
      'comparar fondos',
      'diferencias principales',
      'diferencias educativas',
      'resume las diferencias',
    ],
  },
  {
    term: 'Límites de Inversora',
    explanation:
      'Inversora es informativa y educativa. No ejecuta operaciones sobre fondos, no conecta con brókers y no ofrece recomendaciones personalizadas. Puedes aprender conceptos, explorar el catálogo y comparar métricas con calma.',
    keywords: [
      'puedo comprar',
      'comprar fondos aqui',
      'me recomienda',
      'recomienda fondos',
      'asesoramiento personalizado',
      'conectar broker',
      'es un broker',
      'puedo invertir aqui',
    ],
  },
  {
    term: 'Comisión anual',
    explanation:
      'Coste anual del fondo (TER). Cuanto más baja, menos se resta de la rentabilidad bruta. No incluye comisiones de tu banco o bróker.',
    keywords: [
      'comision anual',
      'comisiones',
      'comision',
      'coste anual',
      'gasto anual',
      'importan las comisiones',
      'por que importan las comisiones',
    ],
  },
  {
    term: 'Riesgo orientativo',
    explanation:
      'Indicador simplificado de cuánto puede oscilar el fondo. Bajo suele moverse menos; alto, más. No describe tu tolerancia personal al riesgo.',
    keywords: ['riesgo orientativo', 'nivel de riesgo', 'riesgo del fondo'],
  },
  {
    term: 'Etiqueta de eficiencia',
    explanation:
      'Resume el Score Inversora en palabras sencillas según su posición en la categoría. Es orientativa, no una recomendación de compra.',
    keywords: ['etiqueta de eficiencia', 'eficiencia'],
  },
  {
    term: 'Score Inversora',
    explanation:
      'Puntuación objetiva de 0 a 100 basada en comisiones, seguimiento del índice, tamaño, antigüedad y calidad de datos. Ayuda a comparar dentro de una categoría; no garantiza rentabilidad futura ni es una recomendación de compra. La IA solo explica el resultado; no lo calcula.',
    keywords: [
      'score inversora',
      'inversora score',
      'puntuacion inversora',
      'puntuacion',
      'ranking inversora',
      'criterios del ranking',
      'criterios usa el ranking',
      'como funciona el score',
      'como funciona el inversora score',
      'score garantiza rentabilidad',
      'el score garantiza',
      'score garantiza',
      'garantiza rentabilidad',
      'score',
    ],
  },
  {
    term: 'ISIN',
    explanation:
      'Código internacional que identifica un fondo de forma única, como una matrícula. Sirve para buscarlo en tu bróker.',
    keywords: ['isin', 'codigo isin'],
  },
  {
    term: 'TER',
    explanation:
      'Total Expense Ratio: comisión total anual del fondo expresada en porcentaje. Al comparar TER, usa fondos de la misma categoría: un coste bajo ayuda, pero no es el único criterio ni garantiza mejores resultados.',
    keywords: [
      'ter',
      'total expense ratio',
      'comision ter',
      'comparar ter',
      'menor ter',
      'mirar al comparar ter',
    ],
  },
  {
    term: 'Benchmark',
    explanation:
      'Índice de referencia que el fondo intenta replicar. Sirve para comparar si el fondo sigue bien su objetivo de inversión.',
    keywords: ['benchmark', 'indice de referencia', 'indice referencia'],
  },
  {
    term: 'Gestora',
    explanation:
      'Entidad que administra el fondo. En fondos indexados suele centrarse en replicar el índice con el menor coste posible.',
    keywords: ['gestora', 'gestor', 'administrador del fondo'],
  },
  {
    term: 'Patrimonio',
    explanation:
      'Dinero total invertido en el fondo o en la clase concreta. Un tamaño razonable suele facilitar liquidez y estabilidad operativa.',
    keywords: ['patrimonio', 'aum', 'activos bajo gestion'],
  },
  {
    term: 'Rentabilidad pasada',
    explanation:
      'Resultado histórico en un periodo concreto. No garantiza resultados futuros; ayuda a entender cómo se ha comportado el fondo. Elegir solo por rentabilidad pasada es un error frecuente.',
    keywords: [
      'rentabilidad pasada',
      'rentabilidad historica',
      'rendimiento pasado',
      'garantiza el futuro',
      'garantiza resultados futuros',
      'solo por rentabilidad',
    ],
  },
  {
    term: 'Volatilidad',
    explanation:
      'Mide cuánto oscila el valor del fondo. Una volatilidad más alta implica subidas y bajadas más pronunciadas.',
    keywords: ['volatilidad'],
  },
  {
    term: 'Ratio de Sharpe',
    explanation:
      'Relaciona la rentabilidad obtenida con la volatilidad asumida. Valores más altos suelen indicar mejor compensación por riesgo, dentro del mismo contexto.',
    keywords: ['sharpe', 'ratio de sharpe'],
  },
  {
    term: 'Máxima caída',
    explanation:
      'Mayor caída desde un pico hasta un valle en el periodo analizado. Ayuda a imaginar el peor episodio reciente.',
    keywords: ['maxima caida', 'drawdown', 'caida maxima'],
  },
  {
    term: 'Tracking error',
    explanation:
      'Desviación respecto al índice de referencia. En fondos indexados, un error bajo suele indicar mejor réplica del benchmark.',
    keywords: [
      'tracking error',
      'error de seguimiento',
      'seguimiento del indice',
    ],
  },
  {
    term: 'Exposición sectorial',
    explanation:
      'Reparto del fondo entre sectores económicos (tecnología, salud, etc.). Muestra en qué partes de la economía está invertido.',
    keywords: ['exposicion sectorial', 'sectores', 'sectorial'],
  },
  {
    term: 'Disponibilidad en plataformas',
    explanation:
      'Entidades donde el fondo suele poder contratarse en España. La lista es orientativa: comisiones, clases y disponibilidad cambian. Inversora no recibe comisiones ni recomienda dónde invertir.',
    keywords: ['disponibilidad', 'plataformas', 'brokers', 'donde comprar'],
  },
] as const;

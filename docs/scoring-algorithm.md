# Score Inversora — Algoritmo legado (mvp-1)

> **Estado:** implementación experimental / legado. **No usar** para rankings públicos ni producción.
>
> **Versión canónica del MVP:** [RN-04 (rn-04)](./scoring-rn-04.md) — decisión en [ADR-002](./architecture/adr-002-scoring-mvp-version.md).

Versión en código: `mvp-1`

## Objetivo (mvp-1)

Puntuación de **0 a 100** con seis factores (rentabilidad, riesgo, coste, diversificación, AUM, antigüedad). Fue un prototipo técnico del backend antes de alinear con las reglas de producto RN-04.

Este documento describe **lo que el código hace hoy**. Para lo que debe hacer el MVP en producción, ver [scoring-rn-04.md](./scoring-rn-04.md).

## Fórmula (mvp-1)

```txt
Score Inversora =
  40% Rentabilidad ajustada al riesgo
+ 20% Riesgo
+ 15% Coste (comisión anual / TER)
+ 10% Diversificación
+ 10% Tamaño del fondo (AUM)
+  5% Antigüedad
```

Los pesos viven en `src/modules/scoring/entities/score-weights.ts`.

## Comparación por categoría

Cuando hay fondos comparables en la misma categoría o benchmark, cada factor se normaliza por **percentil dentro del grupo**. Si no hay peers, se usan umbrales absolutos documentados en los calculadores.

Agrupación preferente:

1. `benchmark` (p. ej. MSCI World vs MSCI World)
2. `category` como fallback

## Factores

### 1. Rentabilidad ajustada al riesgo (40 pts)

Métrica principal:

```txt
riskAdjustedReturn = annualizedReturn / volatility
```

- Rentabilidad anualizada: mezcla 60% 1Y + 40% 3Y cuando ambas están disponibles.
- Rentabilidad negativa: penalización.
- Sin datos suficientes: 40% del máximo (puntuación conservadora).

### 2. Riesgo (20 pts)

- 60% volatilidad (menor es mejor dentro del grupo).
- 40% máximo drawdown (menos negativo es mejor).
- Evaluado preferentemente frente a peers de la misma categoría.

### 3. Coste (15 pts)

Basado en TER expresado como porcentaje (p. ej. `0.09` = 0,09%).

Umbrales absolutos orientativos:

| TER      | Puntos |
| -------- | ------ |
| ≤ 0,15%  | 15     |
| ≤ 0,35%  | 12     |
| ≤ 0,60%  | 9      |
| ≤ 1,00%  | 5      |
| > 1,00%  | 2      |

### 4. Diversificación (10 pts)

MVP simplificado:

- Número de posiciones (40% del factor).
- Peso acumulado del top 10 (40%).
- Mayor peso sectorial (20%).

### 5. Tamaño del fondo (10 pts)

Basado en AUM:

| AUM          | Puntos |
| ------------ | ------ |
| > 1.000M     | 10     |
| 500M–1.000M  | 8      |
| 100M–500M    | 6      |
| < 100M       | 3      |

### 6. Antigüedad (5 pts)

| Años  | Puntos |
| ----- | ------ |
| > 5   | 5      |
| 3–5   | 4      |
| 1–3   | 2,5    |
| < 1   | 1      |

## Datos incompletos

Si falta un dato relevante, el factor recibe una puntuación conservadora (40% del máximo) y se marca `incomplete: true` en el desglose. La respuesta incluye una advertencia para el usuario.

## Migración a rn-04

Ver checklist en [ADR-002](./architecture/adr-002-scoring-mvp-version.md). Los factores de rentabilidad, riesgo y diversificación de `mvp-1` podrían reutilizarse en una **v2** del modelo como métricas informativas, no como parte del score MVP.

## Implementación actual (mvp-1)

- Servicio: `ScoringService.calculateFundScore(fund, metrics, context?)`
- Persistencia: `ScoringService.recalculateAllScores()` tras sync diario
- Endpoint: `GET /funds/:id/score` (devuelve `version: "mvp-1"`)
- Tests: `src/modules/scoring/**/*.spec.ts`

## Cálculo automático

Tras sincronizar metadatos y precios en `FundDailySyncService`, se ejecuta `recalculateAllScores()`:

1. Carga todos los fondos persistidos.
2. Deriva métricas de precios, holdings y sectores.
3. Calcula el score con comparación por benchmark/categoría.
4. Guarda el resultado en `funds.score`.

Si el scoring falla, el sync reporta `scoring.status = failed` sin interrumpir metadata/precios.

## Ver también

- [scoring-rn-04.md](./scoring-rn-04.md) — especificación MVP de producción
- [architecture/adr-002-scoring-mvp-version.md](./architecture/adr-002-scoring-mvp-version.md)
- `invesora/docs/product/scoring.md`

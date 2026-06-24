# Score Inversora — Especificación MVP (RN-04)

| Campo | Valor |
|-------|--------|
| **Versión del modelo** | `rn-04` |
| **Estado** | Implementado en backend (`ScoringService`, `rn-04`) |
| **Regla de negocio** | RN-04 del documento oficial Inversora |

---

## Objetivo

Puntuación de **0 a 100** para ordenar fondos **indexados comparables** dentro del mismo benchmark. El score mide **eficiencia técnica relativa** (coste, tracking, tamaño, antigüedad), no predice rentabilidad futura.

La fiscalidad **no** forma parte del score.

---

## Fórmula

```txt
Score Inversora (rn-04) =
  40% TER
+ 40% Tracking error
+ 10% AUM (patrimonio gestionado)
+ 10% Antigüedad del fondo
```

Cada factor se normaliza a **0–100 puntos parciales** dentro del grupo comparable antes de aplicar el peso.

```txt
puntuacionFinal = round(
  0.40 * puntosTer +
  0.40 * puntosTracking +
  0.10 * puntosAum +
  0.10 * puntosEdad
)
```

Resultado final: entero entre **0 y 100**.

---

## Agrupación (RN-02)

- Un fondo solo compite con fondos del **mismo benchmark** (p. ej. MSCI World vs MSCI World).
- Sin benchmark válido → **no participa** en rankings públicos (`scoringStatus: quarantined` o equivalente).
- `category` solo como fallback cuando benchmark falta y la categoría es homogénea.

---

## Normalización por factor

Dentro del peer group (mismo benchmark), cada métrica se convierte en percentil y luego en puntos del factor (0 = peor del grupo, 100 = mejor del grupo), salvo que se indique lo contrario.

| Factor | Métrica | Mejor es… | Puntos máx. del factor |
|--------|---------|-----------|------------------------|
| TER | `ter` (% anual) | Menor | 40 |
| Tracking error | `trackingError` (% anual) | Menor | 40 |
| AUM | `aum` (moneda del fondo) | Mayor | 10 |
| Antigüedad | `fundAgeYears` (años enteros) | Mayor | 10 |

### Datos incompletos

Si falta un input obligatorio para un factor:

- Ese factor recibe **40 % de su máximo** (puntuación conservadora).
- El desglose marca `incomplete: true` en ese criterio.
- La respuesta incluye advertencia en `warnings[]`.
- Si faltan inputs de RN-03 (ISIN, nombre, TER, benchmark, categoría), el fondo **no entra en ranking** (RN-03, RN-05).

---

## Datos mínimos (RN-03)

Para calcular score y aparecer en ranking:

| Campo | Obligatorio |
|-------|-------------|
| ISIN | Sí |
| Nombre | Sí |
| TER | Sí |
| Benchmark | Sí |
| Categoría | Sí |
| Tracking error | Recomendado (factor 40 %) |
| AUM | Recomendado (factor 10 %) |
| Fecha de inicio / antigüedad | Recomendado (factor 10 %) |

---

## Respuesta HTTP (contrato objetivo)

```json
{
  "score": 78,
  "version": "rn-04",
  "breakdown": {
    "ter": { "points": 32, "maxPoints": 40, "label": "Comisión (TER)", "incomplete": false },
    "trackingError": { "points": 30, "maxPoints": 40, "label": "Tracking error", "incomplete": false },
    "aum": { "points": 8, "maxPoints": 10, "label": "Patrimonio (AUM)", "incomplete": false },
    "age": { "points": 8, "maxPoints": 10, "label": "Antigüedad del fondo", "incomplete": false }
  },
  "summary": "…",
  "warnings": []
}
```

Los nombres de clave en `breakdown` deben alinearse con `invesora/src/core/scoring/types.ts` (`ter`, `tracking`, `aum`, `age`).

---

## Etiquetas UI (HU-15)

| Rango | Etiqueta |
|-------|----------|
| 90–100 | Líder de categoría |
| 75–89 | Muy eficiente |
| 50–74 | Consistente / Promedio |
| 30–49 | Mejorable / Por debajo de la media |
| 0–29 | Bajo rendimiento técnico |

---

## Protección al principiante (HU-16)

- Score **&lt; 30** → excluido de destacados y flujos “ideal para principiantes”.
- Puede permanecer en catálogo con advertencia.

---

## Relación con otras versiones

| Versión | Rol |
|---------|-----|
| **rn-04** | MVP de producción (esta spec) |
| **rn-04-mock** | Mock determinista en app para UI/dev |
| **mvp-1** | Legado experimental en API — ver [scoring-algorithm.md](./scoring-algorithm.md) |

Decisión formal: [architecture/adr-002-scoring-mvp-version.md](./architecture/adr-002-scoring-mvp-version.md).

---

## Implementación

Implementado en `ScoringService` con calculadores en `rn04-score-factor.calculators.ts`:

1. Cuatro calculadores RN-04 (`ter`, `tracking`, `aum`, `age`).
2. `invesoraScoreSchema.breakdown` con cuatro claves alineadas al producto.
3. `SCORING_ALGORITHM_VERSION = 'rn-04'`.
4. Peers agrupados por `benchmark` antes de normalizar.
5. Tests en `rn04-score-factor.calculators.spec.ts` y `scoring.service.spec.ts`.

---

## Referencias

- [ADR-002](./architecture/adr-002-scoring-mvp-version.md)
- [scoring-algorithm.md](./scoring-algorithm.md) — legado `mvp-1`
- `invesora/docs/product/scoring.md`

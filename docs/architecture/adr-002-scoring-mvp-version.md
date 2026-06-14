# ADR-002: Versión de scoring MVP — RN-04 frente a mvp-1

| Campo | Valor |
|-------|--------|
| **Estado** | Aceptado |
| **Fecha** | 2026-06-08 |
| **Contexto** | Issue #67 — desalineación entre reglas de producto (RN-04) e implementación backend (`mvp-1`) |

---

## Contexto

Inversora necesita un Score Inversora **determinista, trazable y auditable** (0–100) para rankings públicos de fondos indexados comparables. Existen tres artefactos con modelos distintos:

| Artefacto | Versión | Criterios | Ubicación |
|-----------|---------|-----------|-----------|
| Reglas de producto | **RN-04** | TER 40%, tracking error 40%, AUM 10%, antigüedad 10% | Documento oficial, `invesora/docs/product/scoring.md` |
| Backend API | **mvp-1** | 6 factores (rentabilidad ajustada, riesgo, coste, diversificación, AUM, antigüedad) | `src/modules/scoring/`, `docs/scoring-algorithm.md` |
| Mock cliente (app) | **rn-04-mock** | 4 criterios RN-04 | `inversora/src/core/scoring/criteria.ts` |

Publicar rankings reales con `mvp-1` o `mvp-mock-1` **contradice** las reglas de negocio RN-04 acordadas en el documento oficial y confundiría a usuarios y al asistente IA (ADR-001: la IA explica el score, no lo calcula).

---

## Decisión

### 1. Versión canónica del MVP de producción: **RN-04** (`rn-04`)

El score público del MVP — rankings, destacados, ficha de fondo y respuesta de `GET /funds/:id/score` en producción — **debe** basarse en RN-04:

| Criterio | Peso |
|----------|------|
| TER (comisión) | 40 % |
| Tracking error | 40 % |
| Patrimonio gestionado (AUM) | 10 % |
| Antigüedad del fondo | 10 % |

- Normalización **por percentil dentro del mismo benchmark** (RN-02).
- Identificador de versión en API y respuestas: `rn-04`.
- Especificación detallada: [scoring-rn-04.md](../scoring-rn-04.md).
- Reglas de producto: `invesora/docs/product/scoring.md`.

### 2. Estado de **mvp-1** (backend actual)

`mvp-1` queda clasificado como **implementación experimental / legado**:

- Permanece en el código hasta completar la migración a `rn-04`.
- **No debe usarse** para rankings públicos, destacados trimestre ni integración app en producción.
- Documentado en [scoring-algorithm.md](../scoring-algorithm.md) con etiqueta *legado*.
- Los endpoints actuales pueden seguir devolviendo `version: "mvp-1"` en desarrollo; staging/producción exigen `rn-04` antes del go-live.

### 3. Mock de la app: alinear a **rn-04-mock**

El mock del cliente (`invesora/src/core/scoring/`) debe reflejar los **cuatro criterios RN-04** para desarrollo de UI coherente con producción:

- Versión: `rn-04-mock`.
- Pesos: TER 40%, tracking 40%, AUM 10%, edad 10%.
- Eliminar criterios extra del mock (`consistency`, `dataQuality`) del desglose de scoring; la calidad de datos sigue siendo regla de **visibilidad** (RN-05 / HU-37), no factor del score.

### 4. Criterios fuera del score MVP

Rentabilidad ajustada al riesgo, volatilidad, diversificación y consistencia histórica:

- **No** forman parte del score MVP RN-04.
- Pueden mostrarse como **métricas informativas** en la ficha (ratios, gráficos).
- Quedan reservados para una **v2 del modelo** (`mvp-2` o posterior), documentada en un ADR futuro antes de afectar rankings.

---

## Consecuencias

### Positivas

- Una sola fuente de verdad de producto para rankings y UI.
- El backend y la app convergen hacia el mismo desglose de cuatro factores.
- El asistente IA puede explicar un modelo acordado y estable.

### Coste / trabajo pendiente

| Tarea | Repositorio | Issue sugerida |
|-------|-------------|----------------|
| Implementar motor `rn-04` en `ScoringService` | `inversora-api` | Implementar scoring RN-04 en backend |
| Sustituir calculadores `mvp-1` | `inversora-api` | (misma issue o sub-tarea) |
| Actualizar schema de breakdown (4 factores) | `inversora-api` | (misma issue) |
| Consumir `version: rn-04` desde la app | `invesora` | Integración API scoring |

Esta ADR **no** incluye la implementación del motor RN-04; solo fija la decisión y la documentación.

---

## Criterios de aceptación de la migración a rn-04

- [ ] `SCORING_ALGORITHM_VERSION` (o equivalente) = `rn-04` en backend.
- [ ] Desglose HTTP expone exactamente 4 factores con pesos RN-04.
- [ ] Rankings agrupados por benchmark usan score `rn-04`.
- [ ] Tests unitarios e integración cubren normalización por percentil.
- [ ] `docs/scoring-algorithm.md` apunta a `scoring-rn-04.md` como spec activa.
- [x] App mock usa `rn-04-mock` y mismos IDs de criterio (`ter`, `tracking`, `aum`, `age`).

---

## Referencias

- [scoring-rn-04.md](../scoring-rn-04.md) — especificación objetivo MVP
- [scoring-algorithm.md](../scoring-algorithm.md) — implementación legado `mvp-1`
- `invesora/docs/product/scoring.md` — RN-02, RN-03, RN-04, RN-05
- `invesora/docs/architecture/adr-001-domain-boundaries.md` — scoring en backend, IA solo explica
- `invesora/docs/architecture/adr-002-scoring-mvp-version.md` — espejo en repo app

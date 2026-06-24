# Contrato BFF — `GET /funds/:isin`

| Campo | Valor |
|-------|-------|
| **Estado** | Implementado (v1) — spec de diseño + implementación en `src/modules/bff/` |
| **Versión del contrato** | `bff-fund-detail-v1` |
| **Dominio de referencia (app)** | `invesora/src/core/domain/catalog.ts` → `FundDetail` |
| **Última revisión** | 2026-06-09 |

## Objetivo

Definir el JSON que devuelve la capa **BFF** (Backend-for-Frontend) en `GET /funds/:isin`, alineado con el tipo `FundDetail` que consume la app móvil. Este documento es el **punto de acuerdo** entre frontend y backend y la referencia del agregador implementado.

La app enruta por ISIN (`/funds/[isin]`). El backend core identifica fondos por UUID (`GET /funds/:id`). El BFF resuelve ISIN → fondo interno y agrega las respuestas parciales del core en un único payload listo para la UI.

## Árbol de tipos de dominio (`FundDetail`)

```text
FundDetail                          ← invesora/src/core/domain/catalog.ts
├── fund: FeaturedFund              ← invesora/src/core/domain/fund.ts
├── inversoraScore: number
├── rank?: number
├── scoredBreakdown: ScoreBreakdown ← invesora/src/core/scoring/types.ts
├── scoringStatus: ScoringStatus
├── market: FundMarketSnapshot      ← invesora/src/core/domain/fund-market.ts
└── profile: FundDetailProfile      ← invesora/src/core/domain/fund-detail-profile.ts
```

## Endpoint

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta BFF** | `/funds/:isin` |
| **Parámetro de ruta** | `isin` — ISO 6166, 12 caracteres alfanuméricos; el BFF normaliza a mayúsculas |
| **Autenticación** | Ninguna (MVP) |
| **Content-Type respuesta** | `application/json; charset=utf-8` |
| **Caché recomendada** | `Cache-Control: public, max-age=300` (5 min) — ajustable en staging |

### Diferencia con el core API

| Capa | Identificador | Ejemplo |
|------|---------------|---------|
| **BFF (este contrato)** | ISIN en la URL | `GET /funds/IE00B4L5Y983` |
| **Core API (NestJS actual)** | UUID en la URL | `GET /funds/550e8400-e29b-41d4-a716-446655440000` |

El BFF **no** expone el UUID al cliente salvo dentro de `fund.id` si el equipo acuerda usar el UUID del backend como identificador canónico.

---

## Esquema de respuesta (`FundDetail`)

Convenciones:

- Nombres de campo en **camelCase** (JSON).
- Fechas de mercado en **ISO 8601** (`YYYY-MM-DD` o timestamp completo según el campo).
- Porcentajes numéricos como en dominio: `terPercent: 0.12` = **0,12 %** (no basis points).
- Arrays vacíos `[]` cuando no hay datos; usar `null` solo donde el dominio lo define explícitamente (`percent` en rentabilidades).

### Raíz — `FundDetail`

| Campo | Tipo JSON | Obligatorio | Descripción |
|-------|-----------|-------------|-------------|
| `fund` | `FeaturedFund` | Sí | Metadatos del fondo para hero, tarjetas y navegación |
| `inversoraScore` | `integer` (0–100) | Sí | Score Inversora redondeado |
| `rank` | `integer` ≥ 1 | No | Posición dentro de la categoría del fondo; omitir si no hay ranking |
| `scoredBreakdown` | `ScoreCriterionResult[]` | Sí | Desglose por criterio para `FundScoreBreakdown` |
| `scoringStatus` | `"ok"` \| `"warning"` \| `"quarantined"` | Sí | Estado de confianza del score para la UI |
| `market` | `FundMarketSnapshot` | Sí | Series de rendimiento y regiones para gráficos |
| `profile` | `FundDetailProfile` | Sí | Ficha ampliada: información, rentabilidades, ratios, exposición |

---

### `fund` — `FeaturedFund`

| Campo | Tipo JSON | Obligatorio | Ejemplo | Notas |
|-------|-----------|-------------|---------|-------|
| `id` | `string` | Sí | `"550e8400-e29b-41d4-a716-446655440000"` | **Propuesta:** UUID del backend. Los mocks usan slugs; la app debe aceptar UUID |
| `isin` | `string` | Sí | `"IE00B4L5Y983"` | Mismo valor que el parámetro de ruta (normalizado) |
| `name` | `string` | Sí | `"MSCI World Index Core"` | Desde `Fund.name` |
| `vehicleType` | `"etf"` \| `"mutual-fund"` | Sí | `"etf"` | Desde `Fund.vehicle` |
| `categoryLabel` | `string` | Sí | `"ETF · S&P 500"` | Etiqueta según vehículo + benchmark |
| `themeLabel` | `string` | Sí | `"Multisector global"` | Tema de inversión para tarjetas; origen pendiente (ver § Transformaciones) |
| `badge` | `string` | Sí | `"Ideal para empezar"` | Copy de producto; puede ser cadena vacía si no aplica |
| `idealForBeginners` | `boolean` | Sí | `true` | Derivado de score, riesgo y reglas de producto |
| `efficiencyScore` | `integer` (0–100) | Sí | `86` | **Alias de `inversoraScore`** en la raíz (misma cifra) |
| `terPercent` | `number` ≥ 0 | Sí | `0.12` | Desde `metrics.ter`; `0` si desconocido |
| `riskLevel` | `"low"` \| `"medium"` \| `"high"` | Sí | `"medium"` | Mapeo desde `riskLevel` numérico 1–7 del backend |
| `diversification` | `"low"` \| `"medium"` \| `"high"` | Sí | `"high"` | Derivado de métricas de composición |
| `quarterTag` | `string` | Sí | `"Q1 2026"` | Formato `Q{1-4} {YYYY}`; trimestre del ranking destacado |
| `periodStart` | `string` | Sí | `"2026-01-01"` | Inicio del periodo de ranking (`YYYY-MM-DD`) |
| `periodEnd` | `string` | Sí | `"2026-03-31"` | Fin del periodo de ranking |
| `benefitSummary` | `string` | Sí | `"Invierte en más de 1.500 empresas…"` | Resumen educativo; puede venir de plantilla + datos |
| `featuredReason` | `string` | Sí | `"Bajo coste + alta diversificación"` | Razón del destacado trimestral |
| `isFeatured` | `boolean` | Sí | `true` | Si el fondo está en el destacado del trimestre vigente |

---

### `scoredBreakdown` — `ScoreCriterionResult[]`

Cada elemento:

| Campo | Tipo JSON | Obligatorio | Ejemplo |
|-------|-----------|-------------|---------|
| `id` | `"ter"` \| `"tracking"` \| `"aum"` \| `"age"` \| `"consistency"` \| `"dataQuality"` | Sí | `"ter"` |
| `label` | `string` | Sí | `"Comisión (TER)"` |
| `points` | `integer` ≥ 0 | Sí | `28` |
| `maxPoints` | `integer` > 0 | Sí | `30` |

El array debe incluir **los seis criterios** en orden estable (mismo orden que `SCORING_CRITERIA` en `invesora/src/core/scoring/criteria.ts`). La suma de `points` debe coincidir con `inversoraScore` (±1 por redondeo).

> **Decisión pendiente de alineamiento:** el core API expone el desglose con factores distintos (`riskAdjustedReturn`, `risk`, `cost`, …) en `GET /funds/:id/score`. Ver § [Desglose del score](#desglose-del-score-decisión-pendiente).

---

### `scoringStatus` — `ScoringStatus`

| Valor | Cuándo usarlo |
|-------|----------------|
| `"ok"` | Score calculado con datos suficientes; sin advertencias material |
| `"warning"` | Score calculado pero con datos incompletos o advertencias del motor |
| `"quarantined"` | Solo si el equipo decide **exponer** el fondo con aviso; hoy la app trata cuarentena como **404** en catálogo |

**Comportamiento acordado con mocks actuales:** fondos en cuarentena o bloqueados **no** aparecen en catálogo ni detalle → el BFF responde **404**, no un cuerpo con `scoringStatus: "quarantined"`.

---

### `market` — `FundMarketSnapshot`

| Campo | Tipo JSON | Obligatorio | Descripción |
|-------|-----------|-------------|-------------|
| `performanceByTimeframe` | `Record<Timeframe, FundPerformanceSeries>` | Sí | Claves obligatorias: `ytd`, `1y`, `3y`, `5y`, `max` |
| `regions` | `FundRegionSlice[]` | Sí | Exposición regional resumida |
| `stabilityLabel` | `string` | Sí | Etiqueta legible de estabilidad/volatilidad |
| `stabilityChangePercent` | `number` | No | Variación ilustrativa vs periodo anterior |

#### `FundPerformanceSeries`

| Campo | Tipo | Obligatorio |
|-------|------|-------------|
| `timeframe` | `"ytd"` \| `"1y"` \| `"3y"` \| `"5y"` \| `"max"` | Sí |
| `points` | `{ date: string, value: number }[]` | Sí |
| `asOf` | `string` (ISO timestamp) | Sí |
| `sourceLabel` | `string` | Sí |

- `points[].date`: `YYYY-MM-DD`.
- `points[].value`: nivel indexado; **100 = inicio de la ventana visible** (misma semántica que `value` en `GET /funds/:id/chart`).

#### `FundRegionSlice`

| Campo | Tipo | Obligatorio |
|-------|------|-------------|
| `label` | `string` | Sí |
| `percent` | `number` (0–100) | Sí |

---

### `profile` — `FundDetailProfile`

| Campo | Tipo JSON | Obligatorio | Descripción |
|-------|-----------|-------------|-------------|
| `asOf` | `string` (ISO timestamp) | Sí | Fecha de frescura mostrada en la ficha |
| `sourceLabel` | `string` | Sí | Origen de datos para disclaimers |
| `description` | `string` | Sí | Texto educativo del fondo |
| `manager` | `string` | Sí | Gestora |
| `benchmark` | `string` | Sí | Índice de referencia |
| `vehicleType` | `"etf"` \| `"mutual-fund"` | Sí | Vehículo del producto (ETF cotizado vs fondo de inversión) |
| `tracksIndex` | `boolean` | Sí | `true` cuando `Fund.category = index` (estrategia indexada) |
| `fundAum` | `string` | Sí | AUM formateado para UI (p. ej. `"1.200 M€"`) |
| `classAum` | `string` | No | AUM de la clase comercial |
| `inceptionDate` | `string` | Sí | Fecha de lanzamiento legible (p. ej. `"01/01/2018"`) |
| `summaryRows` | `FundProfileRow[]` | Sí | Tabla resumen (puede ser `[]`) |
| `feeRows` | `FundProfileRow[]` | Sí | Tabla de comisiones |
| `documents` | `FundDocumentRow[]` | Sí | KIID, folleto, etc. |
| `returnsByPeriod` | `FundReturnPeriod[]` | Sí | Rentabilidades por horizonte |
| `returnsByYear` | `FundReturnYear[]` | Sí | Rentabilidades anuales |
| `currencyNote` | `string` | Sí | Nota al pie de divisa |
| `methodNote` | `string` | Sí | Metodología de cálculo de rentabilidades |
| `ratiosByHorizon` | `Record<"12m"\|"3y"\|"5y", FundRatioRow[]>` | Sí | Ratios por horizonte |
| `exposureByTab` | `Record<ExposureTabId, AllocationSlice[]>` | Sí | Exposición por pestaña |
| `distributors` | `FundDistributor[]` | Sí | Lista orientativa; puede ser `[]` en MVP |

#### Tipos anidados (resumen)

| Tipo | Campos clave |
|------|----------------|
| `FundProfileRow` | `id`, `label`, `value`; `emphasis?: "link"` |
| `FundDocumentRow` | `id`, `label`, `status`: `"available"` \| `"coming_soon"`; `url?` |
| `FundReturnPeriod` | `id`, `label`, `percent`: `number` \| `null` |
| `FundReturnYear` | `year`, `percent`: `number` \| `null` |
| `FundRatioRow` | `id`, `label`, `value` (string formateada) |
| `AllocationSlice` | `label`, `percent`; `icon?` (nombre MaterialCommunityIcons) |
| `FundDistributor` | `id`, `name`, `kind`: `"bank"` \| `"broker"`; `note?` |

#### `exposureByTab` — claves obligatorias

| Clave (`ExposureTabId`) | Origen backend propuesto |
|-------------------------|--------------------------|
| `sectorial` | `GET /funds/:id/exposure/sectors` |
| `regional` | Allocations categoría `regional` (cuando exista en DB) |
| `assetAllocation` | Allocations categoría `assetAllocation` |
| `capitalization` | Allocations categoría `capitalization` |
| `portfolio` | Top holdings de `GET /funds/:id/holdings` mapeados a slices |

---

## Fuentes del core API y agregación BFF

El BFF orquesta llamadas internas (mismo proceso NestJS o servicio dedicado) tras resolver el fondo por ISIN:

```text
GET /funds/:isin  (BFF)
    │
    ├─ 1. Resolver fondo por ISIN → fundId (UUID)
    │      Consulta: funds WHERE isin = :isin
    │      Si no existe o visibility = quarantined|blocked → 404
    │
    ├─ 2. GET /funds/:id              → fund base + metrics
    ├─ 3. GET /funds/:id/score        → score, breakdown, warnings
    ├─ 4. GET /funds/:id/chart        → repetir por periodo / agregar timeframes
    ├─ 5. GET /funds/:id/exposure/countries → regions + exposureByTab.regional
    ├─ 6. GET /funds/:id/exposure/sectors   → exposureByTab.sectorial
    ├─ 7. GET /funds/:id/holdings     → exposureByTab.portfolio, diversificación
    └─ 8. Ranking en categoría       → rank (posición en listado ordenado por score)
```

### Tabla de mapeo campo a campo

| Campo `FundDetail` | Fuente core | Transformación BFF |
|--------------------|-------------|-------------------|
| `fund.id` | `Fund.id` | UUID tal cual |
| `fund.isin` | `Fund.isin` | Uppercase; error 404 si null en DB |
| `fund.name` | `Fund.name` | Directo |
| `fund.categoryLabel` | `Fund.vehicle` + `Fund.benchmark` | Etiqueta legible ES según vehículo (`ETF` vs `Fondo indexado`) |
| `fund.vehicleType` | `Fund.vehicle` | Directo |
| `fund.terPercent` | `Fund.metrics.ter` | `0` si `null` |
| `fund.riskLevel` | `Fund.riskLevel` (1–7) | Ver tabla de riesgo abajo |
| `fund.efficiencyScore` | `Fund.score` o score recalculado | Igual que `inversoraScore` |
| `inversoraScore` | `GET …/score` → `score` | Entero 0–100 |
| `rank` | `GET /funds?category=…&sortBy=score` | Índice 1-based del fondo en su peer group |
| `scoredBreakdown` | `GET …/score` → `breakdown` | Ver § desglose pendiente |
| `scoringStatus` | warnings + incomplete flags | Ver reglas arriba |
| `market.performanceByTimeframe.*` | `GET …/chart` (varios `period`) | Reindexar a 100; mapear periodos → timeframes |
| `market.regions` | `GET …/exposure/countries` | `weight` → `percent`; ordenar desc |
| `profile.benchmark` | `Fund.benchmark` | Fallback `"—"` si null |
| `profile.fundAum` | `Fund.metrics.aum` | Formatear con divisa `Fund.currency` |
| `profile.exposureByTab.sectorial` | sectors | `weight` → `percent` |
| `profile.returnsByPeriod` | Precios + métricas derivadas | Calcular YTD, 1Y, 3Y, 5Y |
| `profile.ratiosByHorizon` | `metrics.volatility`, `drawdown`, etc. | Formatear strings para UI |

#### Mapeo `riskLevel` numérico → dominio app

| Backend (`Fund.riskLevel`) | App (`RiskLevel`) |
|----------------------------|-------------------|
| `1`, `2` | `"low"` |
| `3`, `4`, `5` | `"medium"` |
| `6`, `7` | `"high"` |
| `null` | `"medium"` (conservador) + `scoringStatus: "warning"` |

#### Mapeo periodos chart → timeframes app

| Core `period` | App `timeframe` |
|---------------|-----------------|
| *(calcular YTD)* | `ytd` |
| `1Y` | `1y` |
| `3Y` | `3y` |
| `5Y` | `5y` |
| Serie completa disponible | `max` |

---

## Transformaciones y agregaciones del BFF

### Normalización

- **ISIN:** trim + uppercase antes de lookup.
- **Divisa:** `Fund.currency` (ISO 4217) usada para formatear AUM y notas; no se convierte divisa en el BFF en MVP.
- **Porcentajes de exposición:** backend usa `weight`; la app espera `percent` (misma magnitud, nombre distinto).

### Cálculos derivados

| Salida | Entrada | Regla |
|--------|---------|-------|
| `fund.diversification` | holdings count, top10 weight, sector concentration | Umbrales alineados con factor diversificación del scoring |
| `fund.idealForBeginners` | `funds.idealForBeginners` o reglas RN si copy vacío | Ver [fund-editorial-content.md](./fund-editorial-content.md) |
| `market.stabilityLabel` | `metrics.volatility` | Bandas: baja / media / alta volatilidad |
| `profile.returnsByPeriod` | serie de precios | Rentabilidades compuestas; `null` si fondo más joven que el horizonte |
| `profile.ratiosByHorizon` | volatility, drawdown, sharpe-like | Strings ya formateados (`"12,4 %"`, `"0,85"`) |

### Campos sin fuente en core (MVP)

| Campo | Fuente MVP |
|-------|------------|
| `themeLabel`, `badge`, `idealForBeginners` | PostgreSQL `funds` (`editorial` en listados) — ver [fund-editorial-content.md](./fund-editorial-content.md) |
| `benefitSummary`, `featuredReason`, `quarterTag`, `periodStart`, `periodEnd`, `isFeatured` | Config trimestral en `featured-funds-selection.config.ts` |
| `profile.manager`, `profile.description` | FMP metadata cuando esté sincronizada; placeholder educativo mientras tanto |
| `profile.documents` | `[{ status: "coming_soon", … }]` hasta integrar documentación regulatoria |
| `profile.distributors` | `[]` o lista curada estática (no enlaces de compra) |
| `AllocationSlice.icon` | Mapa sector → icono en BFF; omitir si no hay match |

### Desglose del score (decisión pendiente)

| Enfoque | Pros | Contras |
|---------|------|---------|
| **A. Mapear factores backend → criterios app** | Sin cambios en UI | Mapeo aproximado; criterios mock ≠ algoritmo real |
| **B. Actualizar dominio app al breakdown backend** | Una sola fuente de verdad | Refactor UI (`FundScoreBreakdown`, criterios) |
| **C. BFF devuelve ambos formatos** | Transición suave | Payload más grande; deuda técnica |

**Recomendación para la reunión:** adoptar **B** a medio plazo; para el primer hito de integración, **A** con tabla de mapeo documentada abajo.

#### Mapeo propuesto (enfoque A — transitorio)

| Criterio app (`id`) | Factor backend | Notas |
|---------------------|----------------|-------|
| `ter` | `cost` | TER es input principal del factor coste |
| `tracking` | *(parcial)* `riskAdjustedReturn` | Tracking error en `metrics.trackingError`; factor no 1:1 |
| `aum` | `fundSize` | |
| `age` | `age` | |
| `consistency` | `riskAdjustedReturn` | Proxy hasta métrica dedicada |
| `dataQuality` | Suma de flags `incomplete` | Puntos inversos a factores incompletos |

---

## Errores HTTP

| Código | Cuándo | Cuerpo (propuesto) |
|--------|--------|-------------------|
| **200** | Fondo visible y datos agregados | `FundDetail` |
| **400** | ISIN con formato inválido | `{ "statusCode": 400, "message": "Invalid ISIN format", "error": "Bad Request" }` |
| **404** | ISIN desconocido, `isin` null en DB, fondo en cuarentena/bloqueado, o sin score/publicación | `{ "statusCode": 404, "message": "Fund not found", "error": "Not Found" }` |
| **503** | Core parcialmente caído (timeout en agregación) | `{ "statusCode": 503, "message": "Fund detail temporarily unavailable", "error": "Service Unavailable" }` |

La app trata `null` de `getFundByIsin` como fondo no encontrado; el BFF debe usar **404**, no **200** con cuerpo vacío.

### Validación del parámetro `isin`

Regex (igual que backend): `^[A-Z]{2}[A-Z0-9]{9}[0-9]$`

Ejemplos inválidos → **400**: `IE00B4L5Y98` (11 chars), `ie00b4l5y983` (aceptar tras normalizar a mayúsculas si pasa regex).

---

## Ejemplos de respuesta

### Mínima (fondo joven, datos incompletos)

Fondo reciente: sin rank, rentabilidades largas en `null`, exposición parcial, documentos `coming_soon`.

```json
{
  "fund": {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "isin": "IE00B4L5Y983",
    "name": "MSCI World Index Core",
    "categoryLabel": "Renta Variable Global",
    "themeLabel": "",
    "badge": "",
    "idealForBeginners": true,
    "efficiencyScore": 72,
    "terPercent": 0.12,
    "riskLevel": "medium",
    "diversification": "high",
    "quarterTag": "Q2 2026",
    "periodStart": "2026-04-01",
    "periodEnd": "2026-06-30",
    "benefitSummary": "Fondo indexado global con comisión baja.",
    "featuredReason": "",
    "isFeatured": false
  },
  "inversoraScore": 72,
  "scoredBreakdown": [
    { "id": "ter", "label": "Comisión (TER)", "points": 22, "maxPoints": 30 },
    { "id": "tracking", "label": "Tracking error", "points": 12, "maxPoints": 20 },
    { "id": "aum", "label": "Patrimonio (AUM)", "points": 10, "maxPoints": 15 },
    { "id": "age", "label": "Antigüedad del fondo", "points": 4, "maxPoints": 10 },
    { "id": "consistency", "label": "Consistencia histórica", "points": 14, "maxPoints": 15 },
    { "id": "dataQuality", "label": "Calidad de datos", "points": 10, "maxPoints": 10 }
  ],
  "scoringStatus": "warning",
  "market": {
    "performanceByTimeframe": {
      "ytd": { "timeframe": "ytd", "points": [], "asOf": "2026-06-09T00:00:00.000Z", "sourceLabel": "Financial Modeling Prep" },
      "1y": { "timeframe": "1y", "points": [{ "date": "2025-06-09", "value": 100 }, { "date": "2026-06-09", "value": 108.2 }], "asOf": "2026-06-09T00:00:00.000Z", "sourceLabel": "Financial Modeling Prep" },
      "3y": { "timeframe": "3y", "points": [], "asOf": "2026-06-09T00:00:00.000Z", "sourceLabel": "Financial Modeling Prep" },
      "5y": { "timeframe": "5y", "points": [], "asOf": "2026-06-09T00:00:00.000Z", "sourceLabel": "Financial Modeling Prep" },
      "max": { "timeframe": "max", "points": [{ "date": "2024-01-02", "value": 100 }, { "date": "2026-06-09", "value": 115.4 }], "asOf": "2026-06-09T00:00:00.000Z", "sourceLabel": "Financial Modeling Prep" }
    },
    "regions": [{ "label": "Estados Unidos", "percent": 68.2 }],
    "stabilityLabel": "Volatilidad media"
  },
  "profile": {
    "asOf": "2026-06-09T00:00:00.000Z",
    "sourceLabel": "Financial Modeling Prep",
    "description": "Fondo indexado que replica el MSCI World.",
    "manager": "—",
    "benchmark": "MSCI World",
    "vehicleType": "etf",
    "tracksIndex": true,
    "fundAum": "850 MUSD",
    "inceptionDate": "15/03/2024",
    "summaryRows": [],
    "feeRows": [{ "id": "ter", "label": "TER", "value": "0,12 %" }],
    "documents": [{ "id": "kiid", "label": "KIID", "status": "coming_soon" }],
    "returnsByPeriod": [
      { "id": "ytd", "label": "YTD", "percent": 4.1 },
      { "id": "1y", "label": "1 año", "percent": 8.2 },
      { "id": "3y", "label": "3 años", "percent": null },
      { "id": "5y", "label": "5 años", "percent": null }
    ],
    "returnsByYear": [{ "year": 2025, "percent": 6.8 }],
    "currencyNote": "* Calculada en USD",
    "methodNote": "Rentabilidades netas de comisiones del fondo.",
    "ratiosByHorizon": {
      "12m": [{ "id": "volatility", "label": "Volatilidad", "value": "—" }],
      "3y": [],
      "5y": []
    },
    "exposureByTab": {
      "sectorial": [],
      "regional": [{ "label": "América del Norte", "percent": 72.1 }],
      "assetAllocation": [],
      "capitalization": [],
      "portfolio": []
    },
    "distributors": []
  }
}
```

### Típica (fondo establecido con rank)

Incluye `rank`, series completas en `1y`/`3y`, exposición sectorial y desglose completo.

```json
{
  "fund": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "isin": "IE00B5BMR087",
    "name": "S&P 500 Acc",
    "categoryLabel": "Renta Variable USA",
    "themeLabel": "Tecnología y mega caps",
    "badge": "Núcleo de cartera",
    "idealForBeginners": true,
    "efficiencyScore": 84,
    "terPercent": 0.07,
    "riskLevel": "medium",
    "diversification": "high",
    "quarterTag": "Q1 2026",
    "periodStart": "2026-01-01",
    "periodEnd": "2026-03-31",
    "benefitSummary": "Ideal para diversificación a largo plazo con sesgo a grandes empresas de EE. UU.",
    "featuredReason": "Comisión mínima + referencia global",
    "isFeatured": true
  },
  "inversoraScore": 84,
  "rank": 2,
  "scoredBreakdown": [
    { "id": "ter", "label": "Comisión (TER)", "points": 29, "maxPoints": 30 },
    { "id": "tracking", "label": "Tracking error", "points": 16, "maxPoints": 20 },
    { "id": "aum", "label": "Patrimonio (AUM)", "points": 14, "maxPoints": 15 },
    { "id": "age", "label": "Antigüedad del fondo", "points": 9, "maxPoints": 10 },
    { "id": "consistency", "label": "Consistencia histórica", "points": 11, "maxPoints": 15 },
    { "id": "dataQuality", "label": "Calidad de datos", "points": 5, "maxPoints": 10 }
  ],
  "scoringStatus": "ok",
  "market": {
    "performanceByTimeframe": {
      "ytd": { "timeframe": "ytd", "points": [{ "date": "2026-01-02", "value": 100 }, { "date": "2026-06-09", "value": 106.1 }], "asOf": "2026-06-09T00:00:00.000Z", "sourceLabel": "Financial Modeling Prep" },
      "1y": { "timeframe": "1y", "points": [{ "date": "2025-06-09", "value": 100 }, { "date": "2026-06-09", "value": 112.5 }], "asOf": "2026-06-09T00:00:00.000Z", "sourceLabel": "Financial Modeling Prep" },
      "3y": { "timeframe": "3y", "points": [{ "date": "2023-06-09", "value": 100 }, { "date": "2026-06-09", "value": 142.3 }], "asOf": "2026-06-09T00:00:00.000Z", "sourceLabel": "Financial Modeling Prep" },
      "5y": { "timeframe": "5y", "points": [{ "date": "2021-06-09", "value": 100 }, { "date": "2026-06-09", "value": 178.9 }], "asOf": "2026-06-09T00:00:00.000Z", "sourceLabel": "Financial Modeling Prep" },
      "max": { "timeframe": "max", "points": [{ "date": "2018-01-02", "value": 100 }, { "date": "2026-06-09", "value": 210.2 }], "asOf": "2026-06-09T00:00:00.000Z", "sourceLabel": "Financial Modeling Prep" }
    },
    "regions": [
      { "label": "Estados Unidos", "percent": 99.1 },
      { "label": "Otros", "percent": 0.9 }
    ],
    "stabilityLabel": "Volatilidad media",
    "stabilityChangePercent": -0.3
  },
  "profile": {
    "asOf": "2026-06-09T00:00:00.000Z",
    "sourceLabel": "Financial Modeling Prep",
    "description": "Replica el índice S&P 500 con acumulación de dividendos.",
    "manager": "BlackRock",
    "benchmark": "S&P 500",
    "vehicleType": "etf",
    "tracksIndex": true,
    "fundAum": "12.400 MUSD",
    "classAum": "8.100 MUSD",
    "inceptionDate": "01/01/2012",
    "summaryRows": [
      { "id": "domicile", "label": "Domicilio", "value": "Irlanda" },
      { "id": "currency", "label": "Divisa", "value": "USD" }
    ],
    "feeRows": [
      { "id": "ter", "label": "TER", "value": "0,07 %" },
      { "id": "subscription", "label": "Suscripción", "value": "0 %" }
    ],
    "documents": [
      { "id": "kiid", "label": "KIID", "status": "coming_soon" },
      { "id": "prospectus", "label": "Folleto", "status": "coming_soon" }
    ],
    "returnsByPeriod": [
      { "id": "ytd", "label": "YTD", "percent": 6.1 },
      { "id": "1y", "label": "1 año", "percent": 12.5 },
      { "id": "3y", "label": "3 años", "percent": 42.3 },
      { "id": "5y", "label": "5 años", "percent": 78.9 }
    ],
    "returnsByYear": [
      { "year": 2025, "percent": 11.2 },
      { "year": 2024, "percent": 18.4 },
      { "year": 2023, "percent": 9.7 }
    ],
    "currencyNote": "* Calculada en USD",
    "methodNote": "Rentabilidades medias anuales en periodos superiores a un año.",
    "ratiosByHorizon": {
      "12m": [
        { "id": "volatility", "label": "Volatilidad", "value": "14,2 %" },
        { "id": "sharpe", "label": "Ratio Sharpe", "value": "0,92" }
      ],
      "3y": [
        { "id": "volatility", "label": "Volatilidad", "value": "16,8 %" }
      ],
      "5y": [
        { "id": "volatility", "label": "Volatilidad", "value": "17,1 %" }
      ]
    },
    "exposureByTab": {
      "sectorial": [
        { "label": "Tecnología", "percent": 31.2, "icon": "laptop" },
        { "label": "Financiero", "percent": 13.4, "icon": "bank" }
      ],
      "regional": [{ "label": "Estados Unidos", "percent": 99.1 }],
      "assetAllocation": [{ "label": "Renta variable", "percent": 99.5 }],
      "capitalization": [{ "label": "Large cap", "percent": 88.0 }],
      "portfolio": [
        { "label": "Apple Inc.", "percent": 7.1 },
        { "label": "Microsoft Corp.", "percent": 6.8 }
      ]
    },
    "distributors": [
      { "id": "broker-a", "name": "Plataforma ilustrativa A", "kind": "broker", "note": "Verificar clase disponible" }
    ]
  }
}
```

### Completa (todos los tabs, documentos disponibles, featured)

Superset del ejemplo típico: todas las pestañas de exposición pobladas, `documents` con URL, `rank: 1`, `scoringStatus: "ok"`. Estructura idéntica a la típica con arrays completos — usar el mock `getFundDetailProfileMock` + `getFundMarketSnapshotMock` en `invesora` como referencia golden para tests de contrato.

Archivo de referencia para tests E2E del BFF:

- `invesora/src/features/funds/mocks/fund-detail-profile-mock.ts`
- `invesora/src/features/funds/mocks/fund-market-mock.ts`
- `invesora/src/features/funds/services/get-fund-by-isin.ts` (composición actual esperada por la UI)

---

## Implementación (v1)

| Artefacto | Ubicación |
|-----------|-----------|
| Módulo BFF | `src/modules/bff/bff.module.ts` |
| Controlador | `src/modules/bff/controllers/fund-detail.controller.ts` — `GET /funds/:identifier` |
| Agregador | `src/modules/bff/services/fund-detail.service.ts` — `Promise.all` atómico; sin respuestas parciales |
| Schema Zod | `src/modules/bff/entities/fund-detail.schema.ts` |
| Mapper | `src/modules/bff/entities/fund-detail.mapper.ts` |
| Validación ISIN | `src/modules/bff/entities/fund-isin.utils.ts` |
| Swagger DTO | `src/modules/bff/dto/fund-detail-response.dto.ts` — tag `@ApiTags('bff')` |
| Fixtures | `src/modules/bff/fixtures/fund-detail-minimal.fixture.json`, `fund-detail-typical.fixture.json` |
| Tests integración | `test/integration/fund-detail.integration-spec.ts` |

Comportamiento del endpoint:

- **ISIN** en la ruta → respuesta `FundDetail` agregada (score, market, profile, exposición).
- **UUID** en la ruta → respuesta legada de entidad `Fund` (compatibilidad con clientes core).
- **400** — ISIN con formato inválido.
- **404** — fondo no encontrado o sin ISIN asociado.
- **503** — fallo en alguna subconsulta del agregador (sin payload parcial).

Desglose de score: mapeo transitorio **A** (factores backend → 6 criterios de la app).

Ejemplo:

```bash
curl -s "http://localhost:3000/funds/US78462F1030" | jq '.fund.isin, .inversoraScore'
```

---

## OpenAPI / Swagger

| Estado | Acción |
|--------|--------|
| **Implementado** | Módulo `bff` con `FundDetailResponseDto` y tag `@ApiTags('bff')` en `GET /funds/:identifier` |
| **Validación** | Schema Zod en backend (`fund-detail.schema.ts`); schema Zod en app (`core/api/schemas/fund-detail.schema.ts`) derivados de este documento |

DTOs documentados en Swagger:

- `FundDetailResponseDto` — raíz
- DTOs anidados reutilizando nombres de dominio: `FeaturedFundDto`, `FundMarketSnapshotDto`, `FundDetailProfileDto`, `ScoreCriterionResultDto`

URL: `http://localhost:3000/api/docs` → sección **bff**.

---

## Checklist de reunión de alineamiento

- [x] Aprobado formato JSON raíz `FundDetail` (sin wrapper `{ data: … }`)
- [x] Acordado `fund.id` = UUID backend (vs slug de mocks)
- [x] Decisión desglose score: mapeo transitorio **A** (implementado)
- [x] Origen de campos de producto (`themeLabel`, `badge`, `idealForBeginners`) — ver [fund-editorial-content.md](./fund-editorial-content.md) y [featured-funds-endpoint.md](./featured-funds-endpoint.md)
- [x] Comportamiento 404 para fondos no encontrados / sin ISIN
- [x] Umbrales `idealForBeginners` (fallback métrico documentado en ADR-003)
- [ ] Idioma de `categoryLabel` y labels de exposición (ES fijo vs i18n futuro)
- [ ] Estrategia de caché y TTL del agregador BFF
- [x] Fixtures JSON y tests de integración en backend

---

## Referencias

| Recurso | Ubicación |
|---------|-----------|
| Tipo `FundDetail` | `invesora/src/core/domain/catalog.ts` |
| Servicio mock actual | `invesora/src/features/funds/services/get-fund-by-isin.ts` |
| Pantalla consumidora | `invesora/src/features/funds/screens/fund-detail-screen.tsx` |
| Core fund entity | `inversora-api/src/modules/funds/entities/fund.schema.ts` |
| Score API | `inversora-api/src/modules/scoring/entities/invesora-score.schema.ts` |
| Algoritmo score backend | `inversora-api/docs/scoring-algorithm.md` |
| Endpoints core actuales | `inversora-api/docs/roles-and-responsibilities.md` |

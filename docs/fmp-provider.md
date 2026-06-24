# Proveedor Financial Modeling Prep (FMP)

Este documento describe la integración con [Financial Modeling Prep](https://site.financialmodelingprep.com/developer/docs): endpoints consumidos, normalización, fixtures y el flujo hacia la sincronización de composición.

## Resumen

| Capa | Archivo | Responsabilidad |
|------|---------|-----------------|
| Client | `financial-modeling-prep.client.ts` | Llamadas HTTP a FMP (`/stable/*`) |
| Provider | `financial-modeling-prep.provider.ts` | Orquestación mock/live y API pública del módulo |
| Normalizers | `financial-modeling-prep.normalizers.ts` | Raw JSON → tipos de dominio validados con Zod |
| Raw schemas | `financial-modeling-prep.raw.schemas.ts` | Contratos de entrada FMP |
| Domain schemas | `financial-modeling-prep.domain.schemas.ts` | Contratos de salida del provider |
| Fixtures | `fixtures/*.json` | Respuestas deterministas para tests y `FMP_DATA_SOURCE=mock` |

La app **nunca** llama a FMP directamente. Los services de `funds` consumen `FinancialModelingPrepProvider`.

## Terminología: vehículo vs estrategia

Inversora distingue dos dimensiones en el catálogo:

| Dimensión | Campo | Valores | Significado |
|-----------|-------|---------|-------------|
| **Estrategia** | `Fund.category` | `index` | El producto replica un índice de referencia |
| **Vehículo** | `Fund.vehicle` | `etf`, `mutual-fund` | Envoltorio legal y operativa (cotizado vs fondo de inversión) |

FMP expone la composición vía `/stable/etf/*` (datos orientados a **ETFs**). Los fondos de inversión indexados aparecen en búsqueda con `exchangeShortName = MUTUAL_FUND`. El resolver `fund-vehicle.resolver.ts` infiere el vehículo a partir del nombre y del exchange.

## Endpoints FMP consumidos

Todos los endpoints usan la base `FMP_BASE_URL` (por defecto `https://financialmodelingprep.com`) y el parámetro `apikey`.

| Uso en Inversora | Método client | Ruta FMP | Fixture mock |
|------------------|---------------|----------|--------------|
| Búsqueda por ticker | `searchBySymbol` | `GET /stable/search-symbol` | `search-symbol.query-spy.json` |
| Búsqueda por nombre | `searchByName` | `GET /stable/search-name` | `search-name.query-vanguard.json` |
| Perfil del fondo | `fetchFundProfile` | `GET /stable/etf/info` | `etf-info.symbol-spy.json` |
| Precios EOD | `fetchHistoricalData` | `GET /stable/historical-price-eod/full` | `historical-price-eod.symbol-spy.from-2024-01-01.to-2024-01-31.json` |
| **Holdings** | `fetchEtfHoldings` | `GET /stable/etf/holdings` | `etf-holdings.symbol-spy.json` |
| **Pesos sectoriales** | `fetchEtfSectorWeightings` | `GET /stable/etf/sector-weightings` | `etf-sector-weightings.symbol-spy.json` |
| **Pesos geográficos** | `fetchEtfCountryWeightings` | `GET /stable/etf/country-weightings` | `etf-country-weightings.symbol-spy.json` |

Los endpoints de composición requieren un plan FMP superior a Starter: en Starter, `etf/holdings` devuelve **402** y el sync debe ejecutarse con `--no-composition`. Los weightings sectoriales/geográficos pueden estar disponibles en parte de los símbolos, pero no son fiables como bloque único en todos los tickers. El endpoint `etf/info` está disponible en Starter; si devuelve `402` o `403`, el provider hace fallback a metadata de búsqueda.

## API del provider (dominio)

### `searchIndexedProducts(query)`

Descubre productos indexados (ETFs y fondos de inversión) filtrados por estrategia.

### `getFundComposition(symbol)`

Agrega holdings, pesos sectoriales y pesos por país en una sola llamada al provider. En modo live ejecuta tres peticiones en paralelo con `Promise.all`.

**Entrada:** ticker del producto (p. ej. `SPY`).

**Salida normalizada (`ProviderFundComposition`):**

```json
{
  "asOf": "2024-01-31",
  "holdings": [
    {
      "asset": "AAPL",
      "name": "Apple Inc.",
      "isin": "US0378331005",
      "weightPercentage": 7.12,
      "marketValue": 45000000000,
      "sharesNumber": 250000000
    }
  ],
  "sectorWeightings": [
    {
      "sector": "Technology",
      "weightPercentage": 31.5
    }
  ],
  "countryWeightings": [
    {
      "country": "United States",
      "weightPercentage": 97.5
    }
  ]
}
```

**Reglas de normalización:**

- `asOf` se toma del campo `updated` más reciente entre los holdings; si no existe, se usa la fecha UTC actual (`YYYY-MM-DD`).
- Holdings sin `name` ni `asset` se descartan.
- Pesos con `weight` en rango `0–1` se convierten a porcentaje (`× 100`).
- Pesos `≤ 0` o ausentes se descartan.
- Holdings, sectores y países se ordenan por `weightPercentage` descendente.

### Otros métodos del provider

| Método | Descripción |
|--------|-------------|
| `searchIndexedProducts(query, options?)` | Descubrimiento de ETFs y fondos indexados |
| `getFundHistory(symbol, options?)` | Serie de precios EOD normalizada |
| `getFundProfile(symbol)` | Solo metadata de perfil (sin EOD); usar en sync de catálogo cuando el histórico no está en el plan |
| `getFundDetail(symbol, options?)` | Perfil + estadísticas derivadas del histórico (requiere EOD en el plan) |

## Ejemplos de respuesta FMP (raw)

### Holdings — `GET /stable/etf/holdings?symbol=SPY`

```json
[
  {
    "asset": "AAPL",
    "name": "Apple Inc.",
    "isin": "US0378331005",
    "weightPercentage": 7.12,
    "marketValue": 45000000000,
    "sharesNumber": 250000000,
    "updated": "2024-01-31"
  }
]
```

### Pesos sectoriales — `GET /stable/etf/sector-weightings?symbol=SPY`

```json
[
  {
    "symbol": "SPY",
    "sector": "Technology",
    "weightPercentage": 31.5
  },
  {
    "symbol": "SPY",
    "sector": "Financial Services",
    "weightPercentage": 13.2
  }
]
```

### Pesos geográficos — `GET /stable/etf/country-weightings?symbol=SPY`

```json
[
  {
    "country": "United States",
    "weightPercentage": 97.5
  },
  {
    "country": "Ireland",
    "weightPercentage": 1.2
  }
]
```

Los fixtures commiteados en `src/modules/providers/financial-modeling-prep/fixtures/` reproducen estas formas para el símbolo `SPY`.

## Flujo hacia la sincronización de composición

```text
FundCompositionSyncService.syncFromFmp(symbol)
    → FinancialModelingPrepProvider.getFundComposition(symbol)
        → Client: fetchEtfHoldings + fetchEtfSectorWeightings + fetchEtfCountryWeightings
        → Normalizers: buildProviderFundComposition(...)
    → Mappers: mapProviderFundHoldingsToUpsertInputs, mapSectorWeightingsToUpsertInputs,
               mapCountryWeightingsToUpsertInputs
    → FundCompositionService.saveProviderComposition(fundId, asOf, holdings, allocations)
    → PostgreSQL: fund_holdings + fund_allocations (snapshot reemplazado en transacción)
```

El pipeline diario (`FundDailySyncService`) invoca `FundCompositionSyncService` después del sync de metadata y precios. Los endpoints HTTP de lectura (`GET /funds/:id/holdings`, `GET /funds/:id/exposure/sectors`, `GET /funds/:id/exposure/countries`) leen desde PostgreSQL, no desde FMP.

### Mapeo provider → persistencia

| Dato normalizado | Tabla / categoría |
|------------------|-------------------|
| `holdings[]` | `fund_holdings` (con `rank` por peso) |
| `sectorWeightings[]` | `fund_allocations` con `category = sectorial` |
| `countryWeightings[]` | `fund_allocations` con `category = countries` |

## Modo mock y captura de fixtures

| Variable | Valor local | Efecto |
|----------|-------------|--------|
| `FMP_DATA_SOURCE` | `mock` | Lee fixtures del repo; no consume cuota |
| `FMP_DATA_SOURCE` | `live` | Llama a FMP en tiempo real |
| `FMP_SAVE_FIXTURES` | `true` | Persiste respuestas live en `fixtures/` (solo desarrollo) |

Para regenerar fixtures desde la API real:

```bash
# Requiere FMP_API_KEY en .env
node scripts/capture-fmp-fixtures.mjs
```

El script captura búsqueda, precios EOD y los tres endpoints de composición. `etf/info` sigue excluido por ser de pago en muchos planes.

## Verificación

| Tipo | Ubicación | Qué valida |
|------|-----------|------------|
| Unit | `financial-modeling-prep.client.spec.ts` | Rutas y parámetros HTTP de composición |
| Unit | `financial-modeling-prep.normalizers.spec.ts` | Normalización de holdings y weightings |
| Unit | `financial-modeling-prep.provider.spec.ts` | `getFundComposition` mock y live |
| Unit | `fund-composition-sync.service.spec.ts` | Import FMP → persistencia |
| Integration | `test/integration/fund-sync.integration-spec.ts` | Pipeline completo con PostgreSQL y fixtures |

```bash
# Tests unitarios del provider
npx jest src/modules/providers/financial-modeling-prep/

# Tests de sync de composición (requiere PostgreSQL para integración)
npm run test:integration
```

## Ver también

- [fmp-capabilities-roadmap.md](./fmp-capabilities-roadmap.md) — capacidades FMP que podrían nutrir el MVP y backlog backend para explotarlas
- [roles-and-responsibilities.md](./roles-and-responsibilities.md) — pipeline diario y endpoints públicos
- [development-guide.md](./development-guide.md) — patrón para integrar proveedores externos
- [infrastructure-phases.md](./infrastructure-phases.md) — variables de entorno FMP

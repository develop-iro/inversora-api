# Fondos — guía de ingeniería

## Objetivo

El módulo `funds` expone el catálogo de fondos indexados y ETFs, sus métricas,
precios históricos y composición de cartera. El módulo no llama a proveedores
externos desde los endpoints públicos; lee datos persistidos en PostgreSQL y usa
servicios de sincronización para importar datos desde Financial Modeling Prep
(FMP).

## Arquitectura

```txt
HTTP /funds
  -> FundsController
  -> FundsService
  -> FundsRepository, FundPricesService, FundCompositionService
  -> Prisma/PostgreSQL

Sincronización
  -> FundSyncScheduler
  -> FundDailySyncService
  -> FundSyncService / FundPriceSyncService
  -> FinancialModelingPrepProvider
  -> FinancialModelingPrepClient o fixtures
```

Responsabilidades principales:

| Capa | Responsabilidad |
| ---- | --------------- |
| `controllers/` | Define rutas HTTP y metadatos Swagger. |
| `services/FundsService` | Valida parámetros, aplica errores HTTP y compone respuestas. |
| `services/FundSyncService` | Importa metadatos de fondos desde FMP y hace `upsert` por símbolo y proveedor. |
| `services/FundPriceSyncService` | Importa precios EOD e incrementa desde la última fecha persistida. |
| `services/FundDailySyncService` | Orquesta sincronización diaria de metadatos, precios y recálculo de scores. |
| `repositories/` | Encapsula acceso Prisma y mapea registros a entidades de dominio. |
| `entities/` | Contiene esquemas Zod, mappers y reglas de respuesta. |

## Endpoints públicos

Todos los identificadores `:id` deben ser UUID válidos. Los errores de validación
devuelven `400 Bad Request`; los fondos inexistentes devuelven `404 Not Found`.

| Endpoint | Uso | Parámetros |
| -------- | --- | ---------- |
| `GET /funds` | Lista fondos paginados. | `page`, `limit`, `sortBy`, `sortOrder`, `q`, `category`, `currency`, `provider`, `benchmark`, `riskLevel`, `minScore`, `maxScore`, `minTer`, `maxTer`. |
| `GET /funds/:id` | Obtiene el detalle persistido de un fondo. | `id`. |
| `GET /funds/:id/chart` | Devuelve precios indexados para gráficos. | `period` (`1M`, `3M`, `1Y`, `3Y`, `5Y`; por defecto `1Y`). |
| `GET /funds/:id/holdings` | Devuelve posiciones de cartera ordenadas por `rank`. | `asOf` opcional (`YYYY-MM-DD`); usa el último snapshot si se omite. |
| `GET /funds/:id/exposure/sectors` | Devuelve exposición sectorial. | `asOf` opcional. |
| `GET /funds/:id/exposure/countries` | Devuelve exposición geográfica por país. | `asOf` opcional. |

Ejemplo de listado:

```bash
curl 'http://localhost:3000/funds?q=spy&sortBy=score&sortOrder=desc&limit=10'
```

Ejemplo de gráfico:

```bash
curl 'http://localhost:3000/funds/550e8400-e29b-41d4-a716-446655440000/chart?period=1Y'
```

Restricciones verificadas en código:

- `limit` acepta valores entre `1` y `100`.
- `currency` debe ser un código ISO 4217 de 3 letras y se normaliza a mayúsculas.
- `riskLevel` acepta enteros entre `1` y `7`.
- `score` acepta valores de `0` a `100`.
- `category` solo acepta `index`.
- `provider` solo acepta `financial-modeling-prep`.
- Las respuestas de gráfico indexan el primer cierre del periodo a `100`.

## Sincronización de datos

El flujo diario lo registra `FundSyncScheduler` solo cuando
`SYNC_SCHEDULER_ENABLED=true`. La expresión por defecto es `0 6 * * *`.

Pasos del flujo:

1. `FundDailySyncService` obtiene símbolos desde `SYNC_FUND_SYMBOLS`. Si la lista
   está vacía, usa todos los fondos persistidos.
2. Para cada símbolo, `FundSyncService` normaliza el ticker a mayúsculas, obtiene
   detalle desde FMP y hace `upsert` del fondo por `(symbol, provider)`.
3. `FundPriceSyncService` busca el fondo persistido y calcula el rango de precios.
   En modo incremental, empieza el día posterior al último precio guardado.
4. `FundPricesService` valida y guarda precios EOD en lotes de 100 filas.
5. Al terminar los símbolos, `FundDailySyncService` intenta recalcular todos los
   scores con `ScoringService`. Los errores de scoring quedan en el resultado de
   sync y no relanzan la excepción.

Variables relevantes:

| Variable | Descripción |
| -------- | ----------- |
| `FMP_DATA_SOURCE` | `mock` usa fixtures versionadas; `live` llama a FMP. |
| `FMP_API_KEY` | Clave requerida por la validación de entorno, incluso en modo mock. |
| `FMP_BASE_URL` | Base URL de FMP; por defecto `https://financialmodelingprep.com`. |
| `FMP_SAVE_FIXTURES` | Guarda respuestas live como fixtures cuando vale `true`. |
| `SYNC_SCHEDULER_ENABLED` | Activa el cron de sincronización. |
| `SYNC_CRON_EXPRESSION` | Expresión cron para el job `fund-daily-sync`. |
| `SYNC_FUND_SYMBOLS` | Lista separada por comas; se normaliza a mayúsculas. |

Ejemplo de entorno local seguro:

```env
FMP_DATA_SOURCE=mock
FMP_SAVE_FIXTURES=false
SYNC_SCHEDULER_ENABLED=false
SYNC_FUND_SYMBOLS=SPY,QQQ
```

## Fixtures de FMP

El modo `mock` lee fixtures desde
`src/modules/providers/financial-modeling-prep/fixtures`. Úsalo por defecto para
evitar consumo de cuota y para mantener los tests deterministas.

Para refrescar fixtures desde la API live:

```bash
npm run fmp:capture-fixtures
```

Ten en cuenta estas restricciones:

- El script requiere `FMP_API_KEY`.
- El script captura endpoints disponibles en el plan gratuito.
- El endpoint `etf/info` se documenta como pagado en el script y no se captura ahí.
- Si activas `FMP_SAVE_FIXTURES=true`, revisa el diff de fixtures antes de
  commitear para evitar grabar respuestas no intencionales.

## Persistencia y consultas

- `FundsRepository.upsert()` usa la clave única `(symbol, provider)` y reporta si
  creó un registro nuevo.
- `FundPricesRepository.upsertMany()` procesa precios en chunks de 100 para
  limitar el tamaño de las transacciones.
- `FundCompositionRepository.replaceSnapshot()` reemplaza holdings y allocations
  para un `fundId` y `asOf` dentro de una transacción.
- Las consultas de holdings y exposures usan el último snapshot disponible cuando
  `asOf` no se envía.
- Las exposiciones sectoriales leen la categoría `sectorial`; las geográficas por
  país leen la categoría `countries`.

## Tests y cobertura

La PR de cobertura amplía pruebas unitarias sobre los puntos críticos del módulo:

- Validación y mapeo en `entities/*.spec.ts`.
- Persistencia de precios y composición en `repositories/*.spec.ts`.
- Orquestación de sync en `fund-sync.service.spec.ts`,
  `fund-price-sync.service.spec.ts`, `fund-daily-sync.service.spec.ts` y
  `fund-sync.scheduler.spec.ts`.
- FMP client, provider, normalizadores, filtros y fixtures en
  `src/modules/providers/financial-modeling-prep/*.spec.ts`.
- Integración con scoring en `src/modules/scoring/**/*.spec.ts`.

Comandos recomendados:

```bash
npm run test
npm run test:cov
npm run test:ci
```

CI ejecuta `npm run test:cov` en pushes a `main` y en pull requests. La
configuración Jest exige al menos 90% global en branches, funciones, líneas y
sentencias.

## Problemas comunes

- **La app falla al arrancar por configuración**: revisa `.env`; `DATABASE_URL`,
  variables de PostgreSQL y `FMP_API_KEY` son obligatorias.
- **No aparece el cron de fondos**: `SYNC_SCHEDULER_ENABLED` debe ser `true`. En
  desarrollo permanece desactivado por defecto.
- **Una sincronización de precios devuelve `upToDate: true` sin guardar filas**:
  ocurre cuando el rango incremental empieza después de `to` o FMP no devuelve
  datos para el rango.
- **`syncFromFmp()` de precios devuelve `404`**: primero sincroniza metadatos del
  fondo; los precios requieren que exista el fondo por símbolo y proveedor.
- **Los endpoints de exposición devuelven arrays vacíos**: el fondo existe, pero
  no hay snapshot de composición para esa categoría o fecha.

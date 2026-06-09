# Contrato BFF — `GET /funds/:isin`

| Campo | Valor |
|-------|-------|
| **Estado** | Implementado |
| **Versión del contrato** | `bff-fund-detail-v1` |
| **Dominio de referencia (app)** | `invesora/src/core/domain/catalog.ts` → `FundDetail` |
| **Schema canónico (API)** | `src/modules/bff/entities/fund-detail.schema.ts` |

## Endpoint

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta** | `/funds/:isin` |
| **Parámetro** | ISIN ISO 6166 (`^[A-Z]{2}[A-Z0-9]{9}[0-9]$`), normalizado a mayúsculas |
| **Swagger** | Tag `bff` → `FundDetailResponseDto` |

La misma ruta acepta UUID para compatibilidad legada (`GET /funds/:id`); cuando el parámetro es ISIN devuelve `FundDetail`.

## Respuesta (`FundDetail`)

```text
FundDetail
├── fund: FeaturedFund
├── inversoraScore: number
├── rank?: number
├── scoredBreakdown: ScoreCriterionResult[6]
├── scoringStatus: "ok" | "warning" | "quarantined"
├── market: FundMarketSnapshot
└── profile: FundDetailProfile
```

Validación runtime: `fundDetailResponseSchema` (Zod).

## Errores HTTP

| Código | Cuándo |
|--------|--------|
| **200** | Fondo encontrado y agregación completa |
| **400** | ISIN con formato inválido |
| **404** | ISIN desconocido o `isin` null en base de datos |
| **503** | Fallo en algún subcomponente obligatorio (p. ej. score no calculable) |

La respuesta **no** es parcial: si falla un bloque obligatorio, se devuelve 503.

## Agregación interna

`FundDetailService` orquesta en paralelo (`Promise.all`):

1. Resolver fondo por ISIN (`FundsRepository.findByIsin`)
2. Score (`ScoringService.calculateScoreForFundId`)
3. Charts 1Y / 3Y / 5Y (`FundsService.getFundChart`)
4. Exposición países y sectores
5. Holdings y allocations (`regional`, `assetAllocation`, `capitalization`)
6. Histórico de precios para YTD, `max` y rentabilidades
7. Rank en peer group (benchmark / categoría)

## Fixtures para frontend

| Archivo | Uso |
|---------|-----|
| `src/modules/bff/fixtures/fund-detail-minimal.fixture.json` | Fondo joven, datos incompletos |
| `src/modules/bff/fixtures/fund-detail-typical.fixture.json` | Fondo establecido con rank y exposición |

Ejemplo de consumo:

```bash
curl http://localhost:3000/funds/US78462F1030
```

## Referencias

| Recurso | Ubicación |
|---------|-----------|
| Tipo app `FundDetail` | `invesora/src/core/domain/catalog.ts` |
| Mapper BFF | `src/modules/bff/entities/fund-detail.mapper.ts` |
| Tests integración | `test/integration/fund-detail.integration-spec.ts` |

# Guía de desarrollo

Buenas prácticas, convenciones y ejemplos para contribuir a Inversora API. Complementa el README (arranque rápido) y los docs de roles e infraestructura.

## Convenciones generales

| Elemento | Convención | Ejemplo |
|----------|------------|---------|
| Clases | PascalCase | `FundsService` |
| Métodos y variables | camelCase | `getFundById` |
| Archivos y directorios | kebab-case | `funds.controller.ts` |
| Constantes y env vars | UPPER_SNAKE | `DATABASE_URL` |
| Interfaces | `I` + PascalCase | `IFundRepository` |

- TypeScript estricto: sin `any`; tipos explícitos en métodos públicos.
- `import type` para imports que solo se usan como tipo.
- `readonly` en dependencias inyectadas y propiedades inmutables.
- Commits en [Conventional Commits](https://www.conventionalcommits.org/): título breve, cuerpo con detalle si aplica.

---

## Estructura de un módulo de dominio

Al añadir una nueva feature, crea la siguiente estructura bajo `src/modules/<feature>/`:

```text
src/modules/<feature>/
  <feature>.module.ts
  controllers/
    <feature>.controller.ts
    <feature>.controller.spec.ts
  services/
    <feature>.service.ts
    <feature>.service.spec.ts
  repositories/                          # si hay persistencia
    <feature>.repository.ts
    <feature>.repository.spec.ts
  entities/
    <feature>.schema.ts                    # Zod + tipos inferidos
    <feature>.mapper.ts                    # transformaciones dominio ↔ DB
  dto/
    <feature>-response.dto.ts              # decoradores Swagger
```

Registra el módulo en [`src/app.module.ts`](../src/app.module.ts). `main.ts` no debe importar módulos de dominio directamente.

### Ejemplo: registrar un módulo

```typescript
// src/app.module.ts
import { NewFeatureModule } from './modules/new-feature/new-feature.module';

@Module({
  imports: [
    // ... módulos existentes
    NewFeatureModule,
  ],
})
export class AppModule {}
```

---

## Añadir un endpoint

Sigue el flujo **controller → service → repository/provider**. El controller solo enruta y documenta; la lógica vive en el service.

### 1. Controller (fino)

```typescript
// src/modules/funds/controllers/funds.controller.ts (patrón existente)
@Get(':id')
@ApiOperation({ summary: 'Get fund detail by id' })
@ApiOkResponse({ type: FundListItemResponseDto })
getFundById(@Param('id') id: string): Promise<Fund> {
  return this.fundsService.getFundById(id);
}
```

### 2. Service (lógica de negocio)

```typescript
// src/modules/funds/services/funds.service.ts (patrón existente)
async getFundById(id: string): Promise<Fund> {
  const fund = await this.fundsRepository.findById(id);

  if (fund === null) {
    throw new NotFoundException(`Fund ${id} was not found`);
  }

  return fund;
}
```

### 3. Repository (acceso a datos)

```typescript
// src/modules/funds/repositories/funds.repository.ts (patrón existente)
async findById(id: string): Promise<Fund | null> {
  const row = await this.prisma.fund.findUnique({ where: { id } });
  return row === null ? null : mapFundRowToDomain(row);
}
```

### Checklist al añadir un endpoint

- [ ] Decoradores Swagger (`@ApiOperation`, `@ApiOkResponse`, `@ApiQuery`).
- [ ] Tests unitarios del service y del controller.
- [ ] Test E2E si el endpoint es público y crítico para la app.
- [ ] Actualizar `docs/roles-and-responsibilities.md` si es un recurso nuevo.

---

## Integrar un proveedor externo

El patrón FMP en `src/modules/providers/financial-modeling-prep/` es la referencia:

```text
financial-modeling-prep/
  financial-modeling-prep.client.ts       # HTTP calls (axios vía shared/http)
  financial-modeling-prep.provider.ts     # Orquestación mock/live
  financial-modeling-prep.normalizers.ts  # Raw JSON → dominio tipado
  financial-modeling-prep.domain.schemas.ts  # Zod schemas de salida
  financial-modeling-prep.raw.schemas.ts   # Zod schemas de entrada FMP
  financial-modeling-prep.fixture.service.ts  # Lectura/escritura de fixtures
  fixtures/                               # JSON mock para tests y dev
```

### Flujo recomendado

1. **Client** — llama al API externo con el `HttpClientService` de `shared/http` (reintentos incluidos).
2. **Normalizer** — transforma la respuesta cruda a tipos de dominio validados con Zod.
3. **Provider** — decide entre mock (fixtures) y live según `FMP_DATA_SOURCE`.
4. **Fixture** — guarda respuestas reales para tests deterministas (`FMP_SAVE_FIXTURES=true` solo en local).

### Buenas prácticas con proveedores

- Nunca llamar APIs externas directamente desde controllers o services de dominio.
- Siempre ofrecer modo mock con fixtures commiteados en el repo.
- Validar respuestas externas con Zod antes de persistir.
- Documentar endpoints FMP usados y límites de cuota en el PR.

Referencia detallada de endpoints FMP, ejemplos de respuesta y flujo de composición: [fmp-provider.md](./fmp-provider.md).

---

## Capa `core/api`

La capa [`src/core/api/`](../src/core/api/) centraliza contratos Zod de respuestas públicas, validación de salida y un wrapper HTTP para proveedores externos.

```text
src/core/api/
  core-api.module.ts
  http-client.ts              # CoreApiHttpClient → delega en shared/http
  parse-api-response.ts       # parseApiResponse(schema, data, context)
  index.ts
  schemas/
    fund-list.schema.ts       # GET /funds
    fund-detail.schema.ts     # GET /funds/:isin (BFF)
    rankings.schema.ts        # GET /rankings
```

### Cuándo usar cada cliente HTTP

| Cliente | Uso |
|---------|-----|
| `HttpClientService` (`shared/http`) | Implementación base con reintentos y timeout. Usado hoy por FMP. |
| `CoreApiHttpClient` (`core/api`) | Wrapper que mapea fallos externos a `BadGatewayException` (502). Preferirlo en nuevas integraciones outbound. |

### Validar respuestas ensambladas

Después de construir una respuesta HTTP pública, validar con `parseApiResponse`:

```typescript
import { parseApiResponse } from '../../core/api/parse-api-response';
import { fundListResponseSchema } from '../../core/api/schemas/fund-list.schema';

return parseApiResponse(
  fundListResponseSchema,
  { data: items, meta },
  'get-funds',
);
```

Si la validación falla, se lanza `UnprocessableEntityException` (422) y se registra el payload truncado para depuración.

### Use-cases de lectura pública

Los endpoints de catálogo, detalle BFF y rankings delegan en use-cases inyectables:

| Use-case | Archivo | Endpoint |
|----------|---------|----------|
| `GetFundsUseCase` | `src/modules/funds/get-funds.ts` | `GET /funds` |
| `GetFundByIsinUseCase` | `src/modules/bff/get-fund-by-isin.ts` | `GET /funds/:isin` |
| `GetRankingsUseCase` | `src/modules/scoring/get-rankings.ts` | `GET /rankings` |

Los services (`FundsService`, `FundDetailService`, `RankingsService`) permanecen finos y delegan en estos use-cases.

### Errores estandarizados

| Situación | Excepción HTTP |
|-----------|----------------|
| Query/param inválido | `BadRequestException` (400) |
| Fondo no encontrado u oculto | `NotFoundException` (404) |
| Agregación BFF fallida | `ServiceUnavailableException` (503) |
| Fallo HTTP proveedor externo | `BadGatewayException` (502) |
| Respuesta no cumple schema Zod | `UnprocessableEntityException` (422) |

Los schemas canónicos viven en `core/api/schemas/`. Los paths históricos en `modules/*/entities/*.schema.ts` re-exportan desde `core/api` para compatibilidad.

---

## Validación de datos

### Variables de entorno

Toda configuración pasa por Zod en [`src/shared/config/env.schema.ts`](../src/shared/config/env.schema.ts). Si añades una variable:

1. Añádela al schema Zod.
2. Actualiza [`.env.example`](../.env.example).
3. Documenta su uso en [`infrastructure-phases.md`](./infrastructure-phases.md).
4. Añádela a los `env:` de los workflows de CI si es requerida.

### Entidades de dominio

Usa Zod schemas en `entities/` y deriva tipos con `z.infer`:

```typescript
import { z } from 'zod';

export const fundSchema = z.object({
  id: z.string().uuid(),
  symbol: z.string(),
  // ...
});

export type Fund = z.infer<typeof fundSchema>;
```

### DTOs de respuesta HTTP

Los DTOs en `dto/` llevan decoradores `@ApiProperty` de `@nestjs/swagger` para documentación automática. Mantén los DTOs alineados con los schemas Zod de dominio.

---

## Estrategia de testing

```text
        /\
       /  \        E2E (pocos, flujos críticos HTTP)
      /----\
     /      \      Integration (DB + Prisma + FMP mock)
    /--------\
   /          \    Unit (services, mappers, calculadores)
  /____________\
```

| Tipo | Ubicación | Cuándo usar |
|------|-----------|-------------|
| **Unit** | `src/**/*.spec.ts` | Lógica de negocio, mappers, calculadores de score, normalizers |
| **Integration** | `test/integration/*.integration-spec.ts` | Flujos con PostgreSQL real y FMP mock |
| **E2E** | `test/*.e2e-spec.ts` | Endpoints HTTP con supertest y DB real |

### Comandos

```bash
npm run test                    # Unit tests
npm run test:cov                # Unit tests con cobertura
npm run test:integration        # Integration (requiere PostgreSQL)
npm run test:e2e                # E2E (requiere PostgreSQL)
npx jest src/modules/funds/services/funds.service.spec.ts  # Un archivo
```

### Buenas prácticas de tests

- Integration tests usan `FMP_DATA_SOURCE=mock`; nunca llamar FMP live en CI.
- Limpiar datos de test en `afterAll` / `beforeEach` (ver `test/integration/integration-test.utils.ts`).
- Mockear dependencias externas en unit tests; no mockear Prisma en integration tests.
- Si un endpoint público cambia, actualiza o añade un test E2E.

---

## Sync y fixtures

### Modo mock (por defecto)

```bash
# .env
FMP_DATA_SOURCE=mock
FMP_SAVE_FIXTURES=false
SYNC_SCHEDULER_ENABLED=false
```

Los fixtures en `src/modules/providers/financial-modeling-prep/fixtures/` permiten desarrollo y CI sin cuota de API.

### Sync manual en desarrollo

El scheduler automático permanece desactivado por defecto (`SYNC_SCHEDULER_ENABLED=false`). Para poblar PostgreSQL durante desarrollo o QA, usa el endpoint administrativo o el CLI.

#### Variables de entorno

```bash
# .env
ADMIN_SYNC_ENABLED=true
ADMIN_API_KEY=local-dev-admin-key   # mínimo 8 caracteres
SYNC_FUND_SYMBOLS=SPY,QQQ,VTI     # opcional; si está vacío, usa fondos ya persistidos
FMP_DATA_SOURCE=mock              # recomendado en local/CI
```

#### Endpoint HTTP

```bash
curl -X POST http://localhost:3000/admin/sync \
  -H "Content-Type: application/json" \
  -H "X-Admin-Api-Key: local-dev-admin-key" \
  -d '{
    "symbols": ["SPY", "QQQ"],
    "steps": {
      "metadata": true,
      "prices": true,
      "composition": true,
      "scoring": true
    },
    "incrementalPrices": true
  }'
```

También puedes autenticarte con `Authorization: Bearer <ADMIN_API_KEY>`.

Parámetros opcionales del body:

| Campo | Descripción |
|-------|-------------|
| `symbols` | Lista de tickers a sincronizar. Omite para usar `SYNC_FUND_SYMBOLS` o todos los fondos persistidos. |
| `steps.metadata` | Importa metadata del fondo desde FMP. |
| `steps.prices` | Importa precios EOD. |
| `steps.composition` | Importa holdings y exposiciones sector/país. |
| `steps.scoring` | Recalcula scores Inversora. |
| `incrementalPrices` | Reanuda precios desde la última fecha persistida (default `true`). |
| `historyFrom` / `historyTo` | Ventana explícita de precios (`YYYY-MM-DD`). |

La respuesta incluye `runId`, tiempos de ejecución, resultados por símbolo y el estado del scoring. Los upserts son idempotentes; un fallo en un símbolo no aborta el resto.

Si `ADMIN_SYNC_ENABLED=false`, el endpoint responde `404` (oculto). Con clave inválida responde `401`.

Documentación interactiva: Swagger en `/api/docs` (sección **admin**).

#### CLI

Ejecuta el mismo pipeline sin levantar el servidor HTTP:

```bash
npm run sync:run -- --symbols SPY,QQQ
npm run sync:run -- --symbols SPY --no-composition --no-scoring
npm run sync:run -- --scoring
npm run sync:run -- --help
```

Requisitos: PostgreSQL activo, migraciones aplicadas y `.env` configurado (incluye `DATABASE_URL` y `FMP_API_KEY`). El CLI no exige `ADMIN_SYNC_ENABLED`; invoca directamente `FundDailySyncService`.

#### Alternativa: scheduler automático

Para sync recurrente en un entorno controlado:

```bash
SYNC_SCHEDULER_ENABLED=true
SYNC_FUND_SYMBOLS=SPY,QQQ,VTI
```

### Captura de fixtures (solo local, con intención)

```bash
# .env: FMP_DATA_SOURCE=live, FMP_SAVE_FIXTURES=true, FMP_API_KEY=<tu-clave>
npm run fmp:capture-fixtures
```

Commitea los fixtures en un PR dedicado. No dejes `FMP_SAVE_FIXTURES=true` en `.env` de forma permanente.

---

## Flujo de trabajo Git

### Ramas

Usa ramas con prefijo numérico alineado con issues del proyecto:

```text
59-documentar-roles-e-infraestructura-para-desarrollo-de-nuevas-fases-de-la-api
```

### Commits

```text
feat(funds): add composition sync to daily pipeline

Wire FundCompositionService into FundDailySyncService so holdings
and sector/country allocations are persisted after price sync.

```

### Git hooks (pre-commit)

Tras `npm install`, [Husky](https://typicode.github.io/husky/) registra un hook
`pre-commit` que ejecuta [lint-staged](https://github.com/lint-staged/lint-staged)
sobre los archivos staged:

- `eslint --fix`
- `prettier --write`

Esto evita fallos de formato o lint en CI por cambios locales no formateados.

### Git hooks (pre-push)

El hook `pre-push` ejecuta `npm run test:ci` (unit tests con coverage y umbral
global del 90%). Se dispara antes de `git push`, no en cada commit, para no
ralentizar el flujo local.

Para saltar un hook puntualmente (solo si es imprescindible):

```bash
git commit --no-verify   # omite pre-commit
git push --no-verify     # omite pre-push (coverage)
```

### Checklist pre-PR

```bash
npm run lint
npm run format:ci     # verificar formato sin modificar
npm run build
npm run test
npm run test:integration
```

- [ ] Tests pasan localmente.
- [ ] Sin secretos en el diff (`.env`, API keys).
- [ ] Documentación actualizada si cambia contrato público, env vars o arquitectura.
- [ ] PR con descripción: qué, por qué, cómo probar.

---

## Anti-patrones

| Anti-patrón | Por qué evitarlo | Alternativa |
|-------------|------------------|-------------|
| Lógica de negocio en controllers | Dificulta testing y reutilización | Delegar al service |
| Usar `any` | Pierde seguridad de tipos | Zod schemas + tipos inferidos |
| Llamar Prisma desde controllers | Acopla HTTP a persistencia | Repository |
| Llamar FMP live en CI | Cuota limitada, tests no deterministas | `FMP_DATA_SOURCE=mock` |
| `new Service()` manualmente | Rompe inyección de NestJS | Constructor injection |
| Saltarse validación de env | Fallos opacos en runtime | `envSchema` en bootstrap |
| Scoring en la app (producción) | No auditable ni reproducible | `ScoringService` en servidor |
| Commitear `.env` con claves | Riesgo de seguridad | `.env.example` sin secretos |

---

## Documentar cambios

| Tipo de cambio | Acción |
|----------------|--------|
| Nuevo endpoint público | Actualizar Swagger (automático con DTOs) y tabla en `roles-and-responsibilities.md` |
| Nueva variable de entorno | `.env.example` + `infrastructure-phases.md` |
| Nuevo módulo | `roles-and-responsibilities.md` + entrada en `docs/README.md` si es significativo |
| Cambio de scoring | `scoring-algorithm.md` + `invesora/docs/product/scoring.md` |
| Decisión irreversible | Nuevo ADR en `docs/architecture/adr-NNN-titulo.md` |

---

## Ver también

- [README.md](../README.md) — instalación y scripts
- [roles-and-responsibilities.md](./roles-and-responsibilities.md) — capas y módulos
- [infrastructure-phases.md](./infrastructure-phases.md) — entornos y CI/CD
- [AGENTS.md](../AGENTS.md) — instrucciones para agentes de código
- `.cursor/rules/nestjs-typescript-standards.mdc` — estándares NestJS del proyecto

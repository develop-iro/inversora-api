# Tests de integración

## Objetivo

Los tests de integración validan que los módulos de proveedores, fondos y
persistencia funcionan juntos con datos realistas. Cubren el flujo:

```txt
FMP fixtures -> provider FMP -> servicios de fondos -> Prisma -> PostgreSQL
```

No sustituyen a los tests unitarios ni a los tests end-to-end HTTP. Su foco es
probar contratos entre módulos y escritura/lectura real en PostgreSQL.

## Alcance

| Suite | Cubre | Dependencias |
| --- | --- | --- |
| `test/integration/fmp.integration-spec.ts` | Lectura y normalización de fixtures FMP para búsqueda, detalle e histórico de `SPY`. | Fixtures locales. |
| `test/integration/postgres-prisma.integration-spec.ts` | Conexión Prisma, `SELECT 1`, y persistencia con `FundsRepository`. | PostgreSQL local o de CI. |
| `test/integration/fund-sync.integration-spec.ts` | Sync de metadatos y precios desde FMP mock hasta PostgreSQL. | Fixtures locales, Prisma y PostgreSQL. |

La configuración Jest vive en `test/jest-integration.json` y ejecuta los tests
en serie con `--runInBand` para evitar conflictos sobre el mismo símbolo de
fixture.

## Ejecución local

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Arranca PostgreSQL:

   ```bash
   npm run db:up
   ```

3. Aplica migraciones:

   ```bash
   npm run prisma:migrate:deploy
   ```

4. Ejecuta la suite:

   ```bash
   npm run test:integration
   ```

La conexión por defecto es
`postgresql://inversora:inversora@localhost:5432/inversora`. Si usas otra base
de datos, exporta `DATABASE_URL` y las variables `POSTGRES_*` antes de ejecutar
la suite.

## Datos de prueba y fixtures

- Los tests usan `FMP_DATA_SOURCE=mock` y no consumen cuota de la API de FMP.
- El símbolo de referencia es `SPY`, definido en
  `test/integration/integration-test.utils.ts`.
- Los fixtures están en
  `src/modules/providers/financial-modeling-prep/fixtures/`.
- El helper `deleteFundBySymbol()` elimina el fondo `SPY`; las relaciones de
  precios y composición se eliminan por cascada.

Para refrescar fixtures desde FMP, usa una clave real y ejecuta:

```bash
npm run fmp:capture-fixtures
```

Hazlo solo cuando quieras actualizar datos versionados. El script captura
endpoints disponibles en el tier gratuito; `etf-info.symbol-spy.json` no se
regenera con ese script.

## CI

El job `integration-tests` en `.github/workflows/test.yml` levanta PostgreSQL
`16-alpine`, ejecuta `npm run prisma:migrate:deploy` y luego
`npm run test:integration`.

El job define `FMP_API_KEY=integration-test-fmp-key` porque la configuración
valida que exista una clave, aunque la suite usa fixtures locales en modo mock.

## Comportamiento cuando PostgreSQL no está disponible

Las suites que requieren base de datos llaman a `isDatabaseAvailable()` antes de
crear el módulo Nest. Si PostgreSQL no acepta conexiones, esas suites registran
un aviso y omiten sus assertions. La suite de FMP fixtures sí debe ejecutarse
sin PostgreSQL.

Este comportamiento permite validar providers sin base de datos, pero no debe
ocultar fallos de CI. En CI, el servicio PostgreSQL debe estar sano antes de
ejecutar migraciones y tests.

## Troubleshooting

| Síntoma | Causa probable | Acción |
| --- | --- | --- |
| `Environment validation failed` | Falta `DATABASE_URL`, `FMP_API_KEY` o alguna variable requerida. | Copia `.env.example` o exporta las variables necesarias. |
| `PostgreSQL is not available. Skipping...` | El contenedor no está levantado o usa otro puerto. | Ejecuta `npm run db:up`, revisa `POSTGRES_PORT` y valida con `npm run db:validate`. |
| Error de migración Prisma | La base no tiene el schema actual. | Ejecuta `npm run prisma:migrate:deploy` antes de la suite. |
| Fixtures FMP vacíos o inesperados | Los archivos versionados no contienen el símbolo/rango esperado. | Revisa los fixtures de `SPY` o regenera intencionalmente con `npm run fmp:capture-fixtures`. |
| Conflictos de datos entre tests | La suite comparte el símbolo `SPY`. | Mantén `--runInBand` y limpia el símbolo con `deleteFundBySymbol()`. |

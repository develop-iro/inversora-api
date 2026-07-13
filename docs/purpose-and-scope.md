# Propósito y alcance de Inversora API

Resumen alineado a la Memoria Final Inversora y al documento oficial (*Documentación de Proyecto: Inversora*, v1.0). Las reglas de producto completas viven en `invesora/docs/product/`. Ante conflicto, **prevalece la Memoria Final Inversora como fuente de verdad de entrega/as-built**.

| Sección doc oficial | Doc canónica en `invesora` |
|---------------------|----------------------------|
| §5 Problema que resuelve Inversora | `docs/product/problem-statement.md` |
| §2 Objetivos y MVP | `docs/product/objectives.md` |
| §3 Alcance funcional | `docs/product/mvp-scope.md` |
| §4 Público y perfiles | `docs/product/target-audience-and-profiles.md` |

## Qué es

**Inversora API** es el backend de datos y scoring de [Inversora](https://github.com/): una aplicación educativa que ayuda a principiantes a **explorar, entender y comparar productos indexados validados** sin ejecutar inversiones ni ofrecer asesoramiento personalizado.

La API cumple tres funciones principales en el MVP:

1. **Catálogo** — Exponer productos indexados validados con metadatos, métricas y estado de calidad de datos.
2. **Scoring** — Calcular y persistir el Score Inversora de forma determinista, trazable y auditable.
3. **Datos de mercado** — Sincronizar precios históricos, composición y exposición desde proveedores externos (hoy Financial Modeling Prep).

El principio rector del producto es *educar primero, comparar después*. La API provee los datos objetivos; la app los presenta con contexto educativo y avisos legales.

## Qué no es (MVP)

| Inversora API es | Inversora API no es |
|------------------|---------------------|
| Fuente de verdad de fondos, métricas y scores | Broker, roboadvisor ni ejecutor de órdenes |
| Servicio de lectura HTTP para la app móvil/web | Gestor de usuarios, cuentas o sesiones |
| Motor de scoring en servidor | Generador de recomendaciones de compra/venta |
| Sincronizador de datos de mercado | Custodio de carteras ni favoritos del usuario |

Los **favoritos** y la **calculadora** viven en el cliente (almacenamiento local). El **perfil educativo orientativo** se guarda localmente y, de forma opcional, el cliente sincroniza **solo dimensiones derivadas** (sin respuestas crudas) mediante el módulo `anonymous-devices`.

El **Asistente Inversora** (IA explicativa) **explica** los datos que ya calcula esta API; **no recalcula ni modifica** scores ni rankings. El módulo `assistant` expone herramientas y contexto; la integración completa en todas las superficies de la app sigue en curso (ver `invesora/docs/product/assistant.md`).

## Ecosistema

```mermaid
flowchart LR
    App[Inversora App]
    API[inversora-api]
    DB[(PostgreSQL)]
    FMP[Financial Modeling Prep]
    FutureAssistant[Asistente Inversora]

    App -->|"GET fondos, scores, charts"| API
    API --> DB
    API --> FMP
    FutureAssistant -.->|"explica, no calcula"| API
```

| Componente | Repositorio / ubicación | Rol |
|------------|-------------------------|-----|
| App Inversora | `invesora` | UI, favoritos locales, calculadora, avisos legales |
| inversora-api | este repositorio | Datos, sync, scoring, contrato HTTP |
| PostgreSQL | Docker local / DB gestionada | Persistencia de fondos, precios y composición |
| FMP | `src/modules/providers/financial-modeling-prep/` | Proveedor operativo de datos de mercado externos (mock o live) |

## Backend oficial

**NestJS + PostgreSQL + Prisma** es la arquitectura canónica del backend de Inversora.

La app móvil integrará esta API reemplazando los mocks en:

- `src/features/funds/services/get-funds.ts`
- `src/features/funds/services/get-fund-by-isin.ts`
- `src/features/funds/services/get-rankings.ts`

Si la documentación de la app menciona Supabase Edge Functions como backend planificado, considérelo **obsoleto**: el servicio HTTP de este repositorio es la referencia de implementación.

## Mapeo pantalla app → responsabilidad API

| Pantalla / flujo (app) | Datos que necesita | Responsabilidad API |
|------------------------|-------------------|---------------------|
| Dashboard `/` | Destacados, ranking teaser, búsqueda | Catálogo filtrado, rankings por benchmark, scores |
| Catálogo `/funds` | Lista con score, rank, filtros | `GET /funds` con paginación, orden y filtros |
| Ficha `/funds/[isin]` | Detalle, score, gráfico, exposición | Detalle por fondo, chart, holdings, exposure, score |
| Comparador `/compare` | Dos fondos lado a lado | Misma ficha × 2 (cliente orquesta) |
| Favoritos `/favorites` | ISINs guardados localmente | **Sin API** en MVP |
| Calculadora `/calculator` | Inputs de aportación y horizonte | **Sin API** en MVP |

## Alcance funcional del MVP (backend)

### Incluido

- Health check y documentación OpenAPI (Swagger).
- Registro de dispositivos anónimos y sync del perfil educativo derivado (`anonymous-devices`).
- Ingesta de eventos de analytics anónimos (`analytics`, HU-41).
- Sincronización de productos indexados desde FMP (metadata + precios EOD).
- Endpoints de lectura: listado, detalle, gráfico histórico, holdings, exposición sectorial y geográfica, score, rankings.
- Contrato BFF orientado a la app (`bff`: `GET /funds/:isin`, destacados).
- Módulo de asistente: herramientas y contexto para explicaciones (sin alterar scoring).
- Cálculo y persistencia del Score Inversora con recálculo automático tras el sync diario.
- Validación de configuración con Zod (`src/shared/config/env.schema.ts`).
- Tests unitarios, de integración (PostgreSQL + Prisma + FMP mock) y E2E en CI.

### Planificado (próximas fases)

- Integración completa de la app móvil sin mocks locales en todos los flujos.
- Staging y producción con FMP live y scheduler activo en todos los entornos.
- Cierre de guardrails del asistente (HU-40) y superficies HU-22–24 en la app.
- Panel operativo avanzado (“Clínica de Datos”) fuera del MVP de usuario.

### Excluido del MVP

- Autenticación, registro y cuentas de usuario.
- Watchlists, carteras y alertas personalizadas.
- Órdenes de compra/venta y conexión con brokers.
- Acciones, cripto, gestión activa y cualquier vehículo fuera del catálogo indexado validado.
- Panel de administración avanzado (“Clínica de Datos”).

## Criterios de éxito (backend MVP)

- La app puede listar fondos reales con score y filtros sin mocks locales.
- Cada fondo visible tiene metadata, precios históricos y un score calculado en servidor.
- El scoring es reproducible: misma entrada → mismo score, con versión de modelo documentada.
- Un desarrollador nuevo arranca el entorno local en menos de 15 minutos siguiendo el README.
- CI en `main` pasa lint, build, tests unitarios, integración y E2E.

## Ver también

- [roles-and-responsibilities.md](./roles-and-responsibilities.md) — capas y módulos internos
- [infrastructure-phases.md](./infrastructure-phases.md) — evolución del despliegue
- [scoring-rn-04.md](./scoring-rn-04.md) — spec de scoring de producción (RN-04)
- [scoring-algorithm.md](./scoring-algorithm.md) — implementación legada en código (`mvp-1`)
- `invesora/docs/product/mvp-scope.md` — alcance completo del producto (§3)
- `invesora/docs/product/objectives.md` — objetivos y validación del MVP (§2)
- `invesora/docs/product/target-audience-and-profiles.md` — perfiles de usuario (§4)
- `invesora/docs/product/scoring.md` — reglas de negocio RN-02 a RN-05

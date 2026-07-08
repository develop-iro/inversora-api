# Documentación de Inversora API

Índice de la documentación del backend de [Inversora](https://github.com/). El detalle de negocio completo vive en el documento oficial del proyecto y en el repositorio de la app; aquí se concentra lo **esencial para desarrollar y mantener el backend** sin duplicar ese volumen.

## Cómo usar estos docs

| Si necesitas… | Lee |
|---------------|-----|
| Entender qué hace la API y qué queda fuera del MVP | [purpose-and-scope.md](./purpose-and-scope.md) |
| Roles del ecosistema, capas internas y módulos NestJS | [roles-and-responsibilities.md](./roles-and-responsibilities.md) |
| Infraestructura recomendada por fases (local → producción) | [infrastructure-phases.md](./infrastructure-phases.md) |
| Buenas prácticas, ejemplos y anti-patrones de desarrollo | [development-guide.md](./development-guide.md) |
| Integración FMP: endpoints, composición y fixtures | [fmp-provider.md](./fmp-provider.md) |
| Capacidades FMP y roadmap de dataset | [fmp-capabilities-roadmap.md](./fmp-capabilities-roadmap.md) |
| SORA: agente OpenAI y runtime Python | [openai-agent-python-backend.md](./openai-agent-python-backend.md) |
| Score Inversora MVP (RN-04, spec de producción) | [scoring-rn-04.md](./scoring-rn-04.md) |
| Decisión RN-04 vs mvp-1 | [architecture/adr-002-scoring-mvp-version.md](./architecture/adr-002-scoring-mvp-version.md) |
| Campos editoriales (`badge`, `themeLabel`, `idealForBeginners`) | [fund-editorial-content.md](./fund-editorial-content.md) · [ADR-003](./architecture/adr-003-fund-editorial-fields.md) |
| Algoritmo legado en código (`mvp-1`) | [scoring-algorithm.md](./scoring-algorithm.md) |
| Arranque rápido local (instalación, scripts, health check) | [README.md](../README.md) |
| **CORS y cliente Expo** (`CORS_ORIGINS`, Expo web) | [cors-and-expo-client.md](./cors-and-expo-client.md) |
| **Despliegue staging (Neon + Railway)** | [staging-deploy.md](./staging-deploy.md) |
| **Endurecimiento de seguridad** (Swagger, throttling, claves, WAF) | [security-hardening.md](./security-hardening.md) |
| Contrato HTTP vivo (endpoints, DTOs) | Swagger en `http://localhost:3000/api/docs` |
| **Contrato BFF** `GET /funds/:isin` → `FundDetail` (app) | [bff-fund-detail-contract.md](./bff-fund-detail-contract.md) |
| **Destacados trimestre** `GET /featured` (dashboard) | [featured-funds-endpoint.md](./featured-funds-endpoint.md) |
| **Visibilidad de catálogo** (`catalogVisibility`, admin) | [catalog-visibility.md](./catalog-visibility.md) |

## Jerarquía de fuentes de verdad

```text
Documento oficial Inversora (negocio, HUs, RN)
        ↓
invesora/docs/product/*           ← reglas de producto (scoring RN-04, alcance MVP)
        ↓
inversora-api/docs/*              ← backend: propósito, roles, infra, guías
        ↓
README.md + AGENTS.md + CLAUDE.md ← onboarding rápido para humanos y agentes
        ↓
src/ + Swagger /api/docs          ← implementación viva
```

## Relación con la app Inversora

La app móvil/web vive en el repositorio hermano `invesora`. Documentación de producto relevante para el backend:

| Tema en la app | Ubicación en `invesora` |
|----------------|-------------------------|
| Visión y principios | `docs/product/vision-and-principles.md` |
| Alcance MVP | `docs/product/mvp-scope.md` |
| Score Inversora y rankings (reglas RN) | `docs/product/scoring.md` |
| Límites de dominio (scoring, favoritos, IA) | `docs/architecture/adr-001-domain-boundaries.md` |
| Estado de implementación por feature | `docs/architecture/mvp-feature-map.md` |

**Decisión de arquitectura:** NestJS + PostgreSQL es el backend oficial de Inversora. La app consumirá esta API vía HTTP, sustituyendo los mocks actuales en `features/funds/services/`.

## Módulos del repositorio

| Módulo | Responsabilidad |
|--------|-----------------|
| `health` | Comprobación de disponibilidad (`GET /health`) |
| `providers` | Integración con Financial Modeling Prep (FMP) |
| `funds` | Catálogo, sync, precios, composición y exposición |
| `scoring` | Cálculo y persistencia del Score Inversora |
| `admin` | Sync manual y gestión de visibilidad (`POST /admin/sync`, `GET/PATCH /admin/funds/*`, CLI `npm run sync:run`) |
| `shared` | Configuración, Prisma, cliente HTTP, Swagger |

## Mantenimiento

Actualiza la documentación en el mismo PR o issue cuando:

| Cambio | Documentos afectados |
|--------|----------------------|
| Nuevo módulo o endpoint público | `roles-and-responsibilities.md`, Swagger, `development-guide.md` si aplica |
| Contrato BFF fund detail | `bff-fund-detail-contract.md`, schema Zod en app y API |
| Campos editoriales de fondos | `fund-editorial-content.md`, ADR-003 |
| Nueva variable de entorno | `.env.example`, `infrastructure-phases.md` |
| Cambio de fase de despliegue o CI | `infrastructure-phases.md` |
| Cambio de pesos o versión del scoring | `scoring-rn-04.md`, ADR-002, `invesora/docs/product/scoring.md` |
| Nueva decisión irreversible de arquitectura | Nuevo ADR en `docs/architecture/adr-NNN-titulo.md` y enlace desde este README |

## Referencias externas

- [NestJS](https://nestjs.com/)
- [Prisma](https://www.prisma.io/)
- [Financial Modeling Prep API](https://site.financialmodelingprep.com/developer/docs)
- Documento oficial: *Documentación de Proyecto: Inversora* (v1.0) — mantener copia local acordada por el equipo

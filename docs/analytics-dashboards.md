# Analytics dashboards (Opción A — PostgreSQL)

Documentación operativa para consultar eventos persistidos en `analytics_events`.

Las vistas SQL se crean en la migración Prisma `20250711120000_add_analytics_events`.

## Vistas

| Vista | Descripción |
|-------|-------------|
| `analytics_learn_step_views_daily` | Vistas por `stepId` del cuestionario learn |
| `analytics_learn_completion_daily` | Conteos diarios de `learn_started` y `learn_completed` |
| `analytics_screen_views_daily` | `screen_view` por superficie y día |
| `analytics_learn_profile_distribution` | Distribución de `riskOrientation` |

## Consultas útiles

Ver el documento equivalente en el repositorio mobile: `invesora/docs/architecture/analytics-dashboards.md`.

## Sentry (capa técnica)

Opcional. Configura `SENTRY_DSN` en el entorno de despliegue. Sin DSN, la API no inicializa Sentry.

## Esquema de eventos

Los nombres válidos están en `src/modules/analytics/entities/analytics-event-names.ts`.

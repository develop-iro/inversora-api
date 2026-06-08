# Infraestructura por fases

Guía de la infraestructura recomendada para desarrollar, integrar y desplegar Inversora API. Las fases son incrementales: cada una se construye sobre la anterior sin reescribir lo existente.

## Resumen de fases

| Fase | Objetivo | Estado |
|------|----------|--------|
| **0 — Local** | Desarrollo y tests en máquina del desarrollador | Implementado |
| **1 — Integración app** | La app móvil consume la API en un entorno staging | Próximo |
| **2 — MVP producción** | Datos reales estables para usuarios | Planificado |
| **3 — Asistente y observabilidad** | IA explicativa, logs, métricas y alertas | Planificado |
| **4 — Escala** | Más fondos, proveedores y rendimiento | Futuro |

---

## Fase 0 — Desarrollo local (implementado)

### Objetivo

Permitir que cualquier desarrollador arranque la API, la base de datos y los tests en su máquina sin dependencias externas pagadas.

### Componentes

| Componente | Tecnología | Configuración |
|------------|------------|---------------|
| API | NestJS en Node.js 20+ | `npm run start:dev` → `http://localhost:3000` |
| Base de datos | PostgreSQL 16 Alpine | `docker-compose.yml` → `npm run db:up` |
| ORM | Prisma 6 | `prisma/schema.prisma`, migraciones en `prisma/migrations/` |
| Datos de mercado | FMP en modo mock | `FMP_DATA_SOURCE=mock` (fixtures en repo) |
| Documentación API | Swagger | `http://localhost:3000/api/docs` |
| Scheduler | NestJS Schedule | Desactivado por defecto (`SYNC_SCHEDULER_ENABLED=false`) |

### Arranque rápido

```bash
npm install
cp .env.example .env
npm run db:up
npm run prisma:migrate:deploy
npm run prisma:validate
npm run start:dev
```

### Variables de entorno (fase 0)

| Variable | Valor recomendado (local) | Descripción |
|----------|---------------------------|-------------|
| `PORT` | `3000` | Puerto HTTP de la API |
| `NODE_ENV` | `development` | Entorno de ejecución |
| `DATABASE_URL` | `postgresql://inversora:inversora@localhost:5432/inversora` | Conexión Prisma |
| `FMP_API_KEY` | Cualquier valor no vacío | Requerido por schema; no se usa en mock |
| `FMP_DATA_SOURCE` | `mock` | Usa fixtures locales sin cuota de API |
| `FMP_SAVE_FIXTURES` | `false` | No sobrescribir fixtures accidentalmente |
| `SYNC_SCHEDULER_ENABLED` | `false` | Evitar sync automático en desarrollo |
| `SYNC_FUND_SYMBOLS` | `SPY,QQQ` (opcional) | Símbolos a sincronizar manualmente |

Referencia completa en [`.env.example`](../.env.example) y validación en [`src/shared/config/env.schema.ts`](../src/shared/config/env.schema.ts).

---

## Fase 1 — Integración con la app (próximo)

### Objetivo

La app Inversora deja de usar mocks locales y consume la API en un entorno staging compartido.

### Componentes adicionales

| Componente | Recomendación |
|------------|---------------|
| API staging | Contenedor NestJS desplegado (Railway, Render, Fly.io) |
| PostgreSQL staging | Instancia gestionada (Neon, Supabase Postgres, RDS) |
| CORS | Configurar orígenes permitidos para Expo web y dispositivos de desarrollo |
| Seed inicial | Script o job de sync para poblar fondos antes de la primera demo |
| Contrato API | Endpoints alineados con `FundDetail` de la app (ver fase de diseño BFF) |

### Criterios para pasar a fase 1

- [ ] Al menos un fondo sincronizado con metadata, precios y score en staging.
- [ ] La app consume `GET /funds` y `GET /funds/:id` sin mocks.
- [ ] CORS configurado para el origen de desarrollo de Expo.
- [ ] Variables de entorno de staging documentadas y separadas de producción.

### Variables de entorno (fase 1)

| Variable | Valor recomendado (staging) |
|----------|----------------------------|
| `NODE_ENV` | `production` |
| `FMP_DATA_SOURCE` | `mock` o `live` con cuota limitada |
| `SYNC_SCHEDULER_ENABLED` | `true` |
| `SYNC_CRON_EXPRESSION` | `0 6 * * *` (06:00 UTC diario) |
| `SYNC_FUND_SYMBOLS` | Lista acotada de tickers de prueba |

---

## Fase 2 — MVP producción (planificado)

### Objetivo

Servir datos reales de fondos indexados a usuarios de la app con disponibilidad y frescura garantizadas.

### Componentes adicionales

| Componente | Recomendación |
|------------|---------------|
| API producción | Contenedor con health check, mínimo 1 réplica |
| PostgreSQL producción | DB gestionada con backups automáticos |
| FMP live | `FMP_DATA_SOURCE=live` con API key de producción |
| Scheduler activo | Sync diario automático de metadata, precios y composición |
| HTTPS | Terminación TLS en el reverse proxy o plataforma de hosting |
| Dominio | `api.inversora.app` o equivalente |

### Criterios para pasar a fase 2

- [ ] Fase 1 completada y validada con la app en dispositivos reales.
- [ ] Pipeline de composición (holdings + exposición) integrado en el sync diario.
- [ ] Rankings agrupados por benchmark comparables.
- [ ] Monitorización básica: health check externo cada 5 minutos.
- [ ] Plan de rollback documentado (migraciones Prisma reversibles o forward-only con backup).

### Recomendaciones de hosting (orientativas)

Sin vendor lock-in. Opciones probadas para equipos pequeños:

| Capa | Opciones | Notas |
|------|----------|-------|
| API (contenedor) | Fly.io, Railway, Render, AWS ECS/Fargate | NestJS compila a `dist/`; arrancar con `node dist/main` |
| PostgreSQL | Neon, Supabase (solo DB), AWS RDS, DigitalOcean Managed DB | Cualquier PostgreSQL 14+ compatible con Prisma |
| Secrets | Variables de entorno del hosting o AWS Secrets Manager | Nunca commitear `.env` con claves reales |

NestJS ejecuta el servicio HTTP. La base de datos puede ser cualquier PostgreSQL gestionado; no es necesario usar Supabase Edge Functions.

---

## Fase 3 — Asistente y observabilidad (planificado)

### Objetivo

Añadir el Asistente Inversora (IA explicativa) y visibilidad operativa del sync y la API.

### Componentes adicionales

| Componente | Recomendación |
|------------|---------------|
| Servicio assistant | Módulo o microservicio separado; API key de OpenAI solo en servidor |
| Logs estructurados | JSON logs con `requestId`, `fundId`, duración de sync |
| Métricas | Latencia de endpoints, éxito/fallo de sync, fondos sincronizados |
| Alertas | Notificación si el sync diario falla o la DB no responde |
| Cache (opcional) | Redis para respuestas de catálogo de alta lectura |

### Reglas del asistente (inmutables)

- No calcula ni modifica scores ni rankings.
- No inventa ISIN, TER ni rendimientos.
- No emite consejos de compra o venta.
- Toda respuesta asume el marco educativo (no asesoramiento personalizado).

Ver `invesora/docs/product/assistant.md` y `invesora/docs/architecture/adr-001-domain-boundaries.md`.

---

## Fase 4 — Escala (futuro)

### Objetivo

Soportar un catálogo amplio de fondos, múltiples proveedores de datos y mayor concurrencia.

### Componentes adicionales

| Componente | Recomendación |
|------------|---------------|
| Cola de sync | BullMQ / SQS para sync por fondo en paralelo |
| Multi-provider | Abstracción de proveedor más allá de FMP |
| Cache de lectura | Redis o CDN para `GET /funds` y rankings |
| Réplicas API | Escalado horizontal detrás de load balancer |
| Read replicas DB | Para consultas de catálogo de alta frecuencia |

---

## Tabla de entornos

| Entorno | `NODE_ENV` | `FMP_DATA_SOURCE` | `SYNC_SCHEDULER_ENABLED` | Base de datos |
|---------|------------|-------------------|--------------------------|---------------|
| Local dev | `development` | `mock` | `false` | Docker Compose |
| CI (tests) | `test` | `mock` | `false` | GitHub Actions service container |
| Staging | `production` | `mock` o `live` limitado | `true` | PostgreSQL gestionado |
| Producción | `production` | `live` | `true` | PostgreSQL gestionado con backups |

---

## CI/CD actual

GitHub Actions ejecuta dos workflows:

### `ci.yml` — Pull requests y ramas de feature

```text
lint → prisma-validate → build → unit-tests + integration-tests → report
```

- Se dispara en cada `push` a ramas distintas de `main` (los checks aparecen en el PR asociado).
- Integration tests levantan PostgreSQL 16 como service container.
- FMP siempre en modo `mock`; scheduler desactivado.

### `main.yml` — Rama principal

```text
lint → prisma-validate → build → unit-tests + integration-tests + e2e-tests → report
```

- Se dispara en `push` a `main`.
- Incluye tests E2E adicionales (supertest contra la app NestJS).
- Publica artefacto de cobertura unitaria (retención 30 días).

### Checklist pre-merge (desarrollador)

```bash
npm run lint
npm run build
npm run test
npm run test:integration    # requiere PostgreSQL local o Docker
npm run test:e2e            # requiere PostgreSQL local o Docker
```

En CI, estos comandos se ejecutan automáticamente. No merges a `main` con jobs en rojo.

---

## Servicios Docker locales

El archivo [`docker-compose.yml`](../docker-compose.yml) define un único servicio:

| Servicio | Imagen | Puerto | Volumen |
|----------|--------|--------|---------|
| `postgres` | `postgres:16-alpine` | `${POSTGRES_PORT:-5432}` | `postgres_data` |

Comandos útiles:

```bash
npm run db:up        # Arrancar PostgreSQL
npm run db:down      # Detener y eliminar contenedor
npm run db:logs      # Ver logs del contenedor
npm run db:validate  # Probar conexión TCP
npm run prisma:studio  # UI visual de la base de datos
```

---

## Captura de fixtures FMP

Para actualizar los datos mock desde la API live (solo con intención explícita):

```bash
# .env: FMP_DATA_SOURCE=live, FMP_SAVE_FIXTURES=true
npm run fmp:capture-fixtures
```

**Buena práctica:** commitear los fixtures resultantes en un PR dedicado. No activar `FMP_SAVE_FIXTURES=true` en CI ni en producción.

---

## Ver también

- [purpose-and-scope.md](./purpose-and-scope.md) — alcance funcional por fase de producto
- [roles-and-responsibilities.md](./roles-and-responsibilities.md) — quién es dueño de cada componente
- [development-guide.md](./development-guide.md) — buenas prácticas de desarrollo
- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — pipeline de CI
- [`.github/workflows/main.yml`](../.github/workflows/main.yml) — pipeline de main

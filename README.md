# Inversora API

Backend de datos y scoring para [Inversora](https://github.com/), una aplicación educativa para explorar y comparar fondos indexados.

## Documentación

La documentación completa vive en [`docs/README.md`](docs/README.md). Puntos de entrada rápidos:

| Si necesitas… | Lee |
|---------------|-----|
| Propósito y alcance del backend | [docs/purpose-and-scope.md](docs/purpose-and-scope.md) |
| Roles, módulos y capas internas | [docs/roles-and-responsibilities.md](docs/roles-and-responsibilities.md) |
| Infraestructura por fases | [docs/infrastructure-phases.md](docs/infrastructure-phases.md) |
| Buenas prácticas de desarrollo | [docs/development-guide.md](docs/development-guide.md) |
| Algoritmo del Score Inversora | [docs/scoring-algorithm.md](docs/scoring-algorithm.md) |

## Stack

- [NestJS](https://nestjs.com/) + TypeScript
- PostgreSQL 16 (local via Docker Compose)
- [Prisma](https://www.prisma.io/) ORM
- Financial Modeling Prep (proveedor de datos de mercado, mock o live)
- ESLint + Prettier + GitHub Actions CI

## Requisitos

- Node.js 20+
- npm 10+
- [Docker](https://www.docker.com/) y Docker Compose

## Instalación

```bash
npm install
```

Copia el archivo de variables de entorno:

```bash
cp .env.example .env
```

### Base de datos local (PostgreSQL)

Arranca PostgreSQL con Docker Compose:

```bash
npm run db:up
```

Valida la conexión:

```bash
npm run db:validate
```

Aplica las migraciones de Prisma y valida la conexión ORM:

```bash
npm run prisma:migrate:deploy
npm run prisma:validate
```

Los datos persisten en el volumen Docker `postgres_data`. Para detener el contenedor:

```bash
npm run db:down
```

## Desarrollo

```bash
npm run start:dev
```

La API estará disponible en `http://localhost:3000`.

### Swagger (documentación interactiva)

```
http://localhost:3000/api/docs
```

### Health check

```bash
curl http://localhost:3000/health
```

Respuesta:

```json
{
  "status": "ok",
  "service": "inversora-api"
}
```

## Scripts

| Comando | Descripción |
| ------- | ----------- |
| `npm run start:dev` | Arranca en modo desarrollo con watch |
| `npm run build` | Compila el proyecto |
| `npm run start:prod` | Arranca la build de producción |
| `npm run lint` | Ejecuta ESLint |
| `npm run format` | Formatea el código con Prettier |
| `npm run test` | Ejecuta tests unitarios |
| `npm run test:integration` | Tests de integración (PostgreSQL + Prisma + FMP mock) |
| `npm run test:e2e` | Ejecuta tests end-to-end |
| `npm run db:up` | Arranca PostgreSQL con Docker |
| `npm run db:down` | Detiene PostgreSQL |
| `npm run db:validate` | Valida la conexión a PostgreSQL |
| `npm run db:logs` | Muestra logs del contenedor |
| `npm run prisma:generate` | Genera el cliente Prisma |
| `npm run prisma:migrate:dev` | Crea y aplica migraciones (dev) |
| `npm run prisma:migrate:deploy` | Aplica migraciones (prod/CI) |
| `npm run prisma:validate` | Valida schema y conexión Prisma |
| `npm run prisma:studio` | Abre Prisma Studio |
| `npm run fmp:capture-fixtures` | Captura fixtures FMP desde API live |

## Estructura del proyecto

```
src/
  modules/
    health/           # Health check
    providers/        # Integración FMP
    funds/            # Catálogo, sync, precios, composición
    scoring/          # Score Inversora
  shared/
    config/           # Variables de entorno (Zod)
    database/         # Prisma module y service
    http/             # Cliente HTTP y Swagger
prisma/               # Schema y migraciones
test/
  integration/        # Tests con PostgreSQL real
docs/                 # Documentación centralizada
```

## Licencia

UNLICENSED

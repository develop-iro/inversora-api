# Invesora API

Backend API para [Invesora](https://github.com/), una aplicación móvil para descubrir y analizar fondos de inversión.

## Stack

- [NestJS](https://nestjs.com/) + TypeScript
- PostgreSQL (local via Docker Compose)
- [Prisma](https://www.prisma.io/) ORM
- ESLint + Prettier

Próximamente: Financial Modeling Prep.

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

### Health check

```bash
curl http://localhost:3000/health
```

Respuesta:

```json
{
  "status": "ok",
  "service": "invesora-api"
}
```

## Scripts

| Comando              | Descripción                          |
| -------------------- | ------------------------------------ |
| `npm run start:dev`  | Arranca en modo desarrollo con watch |
| `npm run build`      | Compila el proyecto                  |
| `npm run start:prod` | Arranca la build de producción       |
| `npm run lint`       | Ejecuta ESLint                       |
| `npm run format`     | Formatea el código con Prettier      |
| `npm run test`       | Ejecuta tests unitarios              |
| `npm run test:e2e`   | Ejecuta tests end-to-end             |
| `npm run db:up`      | Arranca PostgreSQL con Docker        |
| `npm run db:down`    | Detiene PostgreSQL                   |
| `npm run db:validate`| Valida la conexión a PostgreSQL      |
| `npm run db:logs`    | Muestra logs del contenedor          |
| `npm run prisma:generate` | Genera el cliente Prisma         |
| `npm run prisma:migrate:dev` | Crea y aplica migraciones (dev) |
| `npm run prisma:migrate:deploy` | Aplica migraciones (prod/CI) |
| `npm run prisma:validate` | Valida schema y conexión Prisma  |
| `npm run prisma:studio` | Abre Prisma Studio               |

## Estructura del proyecto

```
src/
  modules/          # Módulos de dominio (health, funds, scoring, ...)
    health/
  shared/           # Utilidades compartidas
    database/       # Prisma module y service
    config/
    errors/
    http/
prisma/             # Schema y migraciones
  app.module.ts
  main.ts
```

Los futuros módulos (`funds`, `scoring`, `providers`, `charts`) se añadirán bajo `src/modules/`.

## Licencia

UNLICENSED

# Invesora API

Backend API para [Invesora](https://github.com/), una aplicación móvil para descubrir y analizar fondos de inversión.

## Stack

- [NestJS](https://nestjs.com/) + TypeScript
- ESLint + Prettier

Próximamente: PostgreSQL, Prisma y Financial Modeling Prep.

## Requisitos

- Node.js 20+
- npm 10+

## Instalación

```bash
npm install
```

Copia el archivo de variables de entorno:

```bash
cp .env.example .env
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

## Estructura del proyecto

```
src/
  modules/          # Módulos de dominio (health, funds, scoring, ...)
    health/
  shared/           # Utilidades compartidas
    config/
    errors/
    http/
  app.module.ts
  main.ts
```

Los futuros módulos (`funds`, `scoring`, `providers`, `charts`) se añadirán bajo `src/modules/`.

## Licencia

UNLICENSED

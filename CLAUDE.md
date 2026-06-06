# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start:dev     # Dev server with watch mode (http://localhost:3000)
npm run build         # Compile to dist/
npm run lint          # ESLint with auto-fix
npm run format        # Prettier format
npm run test          # Unit tests (jest, rootDir: src, pattern: *.spec.ts)
npm run test:watch    # Unit tests in watch mode
npm run test:cov      # Unit tests with coverage
npm run test:e2e      # E2E tests (config: test/jest-e2e.json)
```

Run a single test file:
```bash
npx jest src/modules/health/health.controller.spec.ts
```

## Architecture

Feature-based, semi-hexagonal structure:

```
src/
  modules/        # One folder per business domain
    health/       # *.module.ts, *.controller.ts, *.service.ts
    funds/        # (planned)
    scoring/      # (planned)
  shared/         # Cross-cutting concerns
    config/
    errors/
    http/
  app.module.ts   # Imports domain modules only
  main.ts         # Bootstrap only (port from PORT env, default 3000)
```

Each module owns its controller, service, optional repository, and DTOs. `AppModule` only wires modules together. `main.ts` stays thin — bootstrap concerns only.

## Coding Standards

### TypeScript

- Explicit return types on all public methods.
- `import type` for type-only imports.
- `readonly` for injected dependencies and immutable properties.
- No `any`; use Zod schemas + inferred types for new complex types.

### NestJS conventions

- Constructor injection only — never `new` a provider manually.
- Controllers handle HTTP routing and delegate everything to services.
- Services hold business logic and stay framework-agnostic where possible.
- Validate incoming payloads with DTOs + `class-validator`.
- Throw NestJS HTTP exceptions (`NotFoundException`, `BadRequestException`, etc.) from services or controllers. Centralize unhandled exceptions in a global `HttpExceptionFilter` in `src/shared/`.

### Naming

| Element           | Convention  | Example                  |
|-------------------|-------------|--------------------------|
| Classes           | PascalCase  | `FundsService`           |
| Interfaces        | IPascalCase | `IFundRepository`        |
| Methods/variables | camelCase   | `getFundById`            |
| Files/directories | kebab-case  | `funds.controller.ts`    |
| Constants/env     | UPPER_SNAKE | `DATABASE_URL`           |

### Commit messages

Follow Conventional Commits. Keep the title brief; put elaboration in the body (two newlines after the title).

## Prompt shortcuts

These keywords in a prompt trigger specific behaviors:

- `CURSOR:PAIR` — act as a pair programmer: surface alternatives, weigh trade-offs.
- `RFC` — refactor per the instructions provided.
- `RFP` — rewrite the given prompt to be clearer, following Google's Technical Writing Style Guide.

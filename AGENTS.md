# AGENTS — AI Coding Agent Instructions

Purpose: help AI coding agents become productive quickly in this NestJS TypeScript repository.

## Documentation

Start with [docs/README.md](docs/README.md) for the full index. Key docs:

| Topic | File |
|-------|------|
| Purpose and MVP scope | [docs/purpose-and-scope.md](docs/purpose-and-scope.md) |
| Roles, modules, layers | [docs/roles-and-responsibilities.md](docs/roles-and-responsibilities.md) |
| Infrastructure phases | [docs/infrastructure-phases.md](docs/infrastructure-phases.md) |
| Development guide | [docs/development-guide.md](docs/development-guide.md) |
| Scoring algorithm | [docs/scoring-algorithm.md](docs/scoring-algorithm.md) |

NestJS + PostgreSQL is the canonical backend for Inversora. The mobile app (`invesora` repo) consumes this API via HTTP.

**Quick Commands**

- `npm run start:dev` : start development server (watch)
- `npm run start` / `npm run start:prod` : run in production
- `npm run build` : compile TypeScript
- `npm run test` : run unit tests
- `npm run test:e2e` : run end-to-end tests
- `npm run test:integration` : run PostgreSQL, Prisma, and FMP integration tests
- `npm run lint` : run ESLint (use `--fix` where appropriate)
- Pre-commit hook (Husky + lint-staged) runs ESLint and Prettier on staged files after `npm install`
- Pre-push hook runs `npm run test:ci` to enforce unit test coverage thresholds before push
- `npm run db:up` : start local PostgreSQL via Docker Compose
- `npm run db:validate` : validate PostgreSQL connection
- `npm run db:down` : stop PostgreSQL container
- `npm run prisma:generate` : generate Prisma client
- `npm run prisma:migrate:deploy` : apply migrations
- `npm run prisma:validate` : validate Prisma schema and DB connection

**Key Files**

- [docs/README.md](docs/README.md) — documentation index
- [README.md](README.md) — project overview and setup
- [package.json](package.json) — scripts and dependencies
- [tsconfig.json](tsconfig.json) — compiler options (strict TS)
- [nest-cli.json](nest-cli.json) — Nest CLI config (sourceRoot: `src`)
- [test/jest-e2e.json](test/jest-e2e.json) — E2E Jest config
- `src/` — application source (see `src/modules/` and `src/shared/`)

**Modules**

| Module | Path | Responsibility |
|--------|------|----------------|
| `health` | `src/modules/health/` | Liveness check |
| `providers` | `src/modules/providers/` | FMP integration |
| `funds` | `src/modules/funds/` | Catalog, sync, prices, composition |
| `scoring` | `src/modules/scoring/` | Inversora Score calculation |

**Framework & Conventions**

- Framework: NestJS (controllers, providers, modules)
- Place new features in `src/modules/<feature>/` with `module`, `controller`, `service` files
- Shared utilities live in `src/shared/` (config, errors, http)
- TypeScript is strict: avoid `any`; prefer explicit types and Zod schemas
- Code style: Prettier + ESLint. Use `npm run format` and `npm run lint` before commits
- See [docs/development-guide.md](docs/development-guide.md) for patterns and anti-patterns

**Testing Guidance for Agents**

- Unit tests: `npm run test` (Jest + ts-jest)
- Integration tests: `npm run test:integration` (PostgreSQL + FMP mock)
- E2E tests: `npm run test:e2e` (supertest); tests live under `test/` and `*.e2e-spec.ts`
- Run `npm run test:cov` for coverage reports
- Always use `FMP_DATA_SOURCE=mock` in tests; never call FMP live in CI

**How an AI Agent Should Operate**

- When making code changes, run relevant tests locally (`npm run test` / `npm run test:e2e`) before suggesting merges
- Prefer small, focused edits; explain rationale in PR description
- Link to project docs instead of copying large sections from README
- If a change touches public APIs, include or update tests and relevant docs

**Common Pitfalls**

- Don't bypass TypeScript strictness — follow typings
- Don't put business logic in controllers — delegate to services
- Don't call FMP live in CI or tests — use mock fixtures
- E2E tests require PostgreSQL running (Docker or CI service container)

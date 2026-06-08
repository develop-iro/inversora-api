# AGENTS — AI Coding Agent Instructions

Purpose: help AI coding agents become productive quickly in this NestJS TypeScript repository.

**Quick Commands**

- `npm run start:dev` : start development server (watch)
- `npm run start` / `npm run start:prod` : run in production
- `npm run build` : compile TypeScript
- `npm run test` : run unit tests
- `npm run test:e2e` : run end-to-end tests
- `npm run test:integration` : run PostgreSQL, Prisma, and FMP integration tests
- `npm run lint` : run ESLint (use `--fix` where appropriate)
- `npm run db:up` : start local PostgreSQL via Docker Compose
- `npm run db:validate` : validate PostgreSQL connection
- `npm run db:down` : stop PostgreSQL container
- `npm run prisma:generate` : generate Prisma client
- `npm run prisma:migrate:deploy` : apply migrations
- `npm run prisma:validate` : validate Prisma schema and DB connection

**Key Files**

- [README.md](README.md) — project overview and setup
- [package.json](package.json) — scripts and dependencies
- [tsconfig.json](tsconfig.json) — compiler options (strict TS)
- [nest-cli.json](nest-cli.json) — Nest CLI config (sourceRoot: `src`)
- [test/jest-e2e.json](test/jest-e2e.json) — E2E Jest config
- `src/` — application source (see `src/modules/` and `src/shared/`)

**Framework & Conventions**

- Framework: NestJS (controllers, providers, modules)
- Place new features in `src/modules/<feature>/` with `module`, `controller`, `service` files
- Shared utilities live in `src/shared/` (config, errors, http)
- TypeScript is strict: avoid `any`; prefer explicit types
- Code style: Prettier + ESLint. Use `npm run format` and `npm run lint` before commits

**Testing Guidance for Agents**

- Unit tests: `npm run test` (Jest + ts-jest)
- E2E tests: `npm run test:e2e` (supertest); tests live under `test/` and `*.e2e-spec.ts`
- Integration tests: `npm run test:integration`; see [docs/integration-tests.md](docs/integration-tests.md) for PostgreSQL setup, FMP fixtures, CI behavior, and troubleshooting.
- Run `npm run test:cov` for coverage reports

**How an AI Agent Should Operate**

- When making code changes, run relevant tests locally (`npm run test` / `npm run test:e2e`) before suggesting merges
- Prefer small, focused edits; explain rationale in PR description
- Link to project docs instead of copying large sections from README
- If a change touches public APIs, include or update tests

**Common Pitfalls**

- Don’t bypass TypeScript strictness — follow typings
- E2E tests require the app to be built or run in dev mode; use `npm run start:dev` for local testing

**Suggested Next Customizations**

- Create a test-runner skill that executes and reports `npm run test` output
- Add a CI hook agent to run `npm run lint`, `npm run test`, and `npm run build`

Feedback: please tell me if you want this as `.github/copilot-instructions.md` instead, or want extra sections (CI, release, modules roadmap).

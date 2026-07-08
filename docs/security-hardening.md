# Security hardening guide

Operational checklist and conventions for securing **inversora-api** and the **invesora** mobile app.

---

## Pre-deploy checklist (API)

- [ ] `APP_ENV=pro` with `SWAGGER_ENABLED=false` (default in `env/pro.env`)
- [ ] `ADMIN_SYNC_ENABLED=false` and `ADMIN_CATALOG_ENABLED=false` unless strictly required
- [ ] Strong unique values for `ADMIN_API_KEY`, `ASSISTANT_INTERNAL_API_KEY`, `ASSISTANT_AGENT_API_KEY` (min 16 chars for agent key)
- [ ] `ASSISTANT_AGENT` port **8001** is **not** exposed publicly; reachable only from the NestJS service network
- [ ] `THROTTLE_REDIS_URL` configured when running multiple API replicas
- [ ] Railway/proxy logs do not capture full outbound URLs with `apikey` query parameters
- [ ] Secrets live in the platform secret store (Railway variables), not in committed `env/*.env` overrides

---

## Pre-deploy checklist (mobile)

- [ ] No secrets use the `EXPO_PUBLIC_` prefix
- [ ] `EXPO_PUBLIC_SSL_PINNING_ENABLED=true` only for production native builds (`start:pro` / EAS `pro` profile)
- [ ] Run `npx expo prebuild` or EAS build after changing `plugins/with-ssl-pinning.js`
- [ ] Rotate SSL pins when Railway renews TLS certificates (see below)

---

## Environment variables

### API (`inversora-api`)

| Variable | Purpose | Default |
|----------|---------|---------|
| `SWAGGER_ENABLED` | OpenAPI UI at `/api/docs` | `true` local/qa, `false` pro |
| `THROTTLE_TTL_SECONDS` | Rate-limit window | `60` |
| `THROTTLE_LIMIT` | Public routes per IP/window | `120` |
| `THROTTLE_ASSISTANT_LIMIT` | SORA routes per IP/window | `30` |
| `THROTTLE_REDIS_URL` | Optional distributed throttler storage | unset |
| `ASSISTANT_AGENT_API_KEY` | Auth for Python `/agent/respond` | required when agent runtime enabled |

### Mobile (`invesora`)

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SSL_PINNING_ENABLED` | Enables ATS / cleartext hardening plugin for native pro builds |
| `EXPO_PUBLIC_BRANDFETCH_CLIENT_ID` | Optional mock logo client id (never a secret) |

---

## Network segmentation

```text
Internet → Railway API (:443) → NestJS
NestJS → internal only → Python agent (:8001)
NestJS → PostgreSQL (Neon)
NestJS → FMP / OpenAI (outbound)
Mobile app → Railway API (HTTPS)
```

- Do **not** publish the Python agent service on a public Railway domain.
- Prefer private networking or `localhost` / Docker internal DNS for `ASSISTANT_AGENT_BASE_URL`.

---

## WAF / CDN (recommended)

Place **Cloudflare** (or similar) in front of the Railway API hostname:

1. Enable HTTPS-only and HSTS at the edge.
2. Add rate limiting for anonymous traffic (`/assistant/*`, `/funds`).
3. Enable bot management on production.
4. Optionally geo-block regions outside your launch market.

Railway remains the origin; Cloudflare is the public entry point.

---

## API key rotation

Rotate keys in this order:

1. Generate new key in secret store.
2. Deploy NestJS with both old and new keys accepted (if dual-key support is added) **or** deploy agent + API together.
3. Update Python agent `ASSISTANT_AGENT_API_KEY` / `SORA_AGENT_API_KEY`.
4. Revoke old key.

Keys to rotate:

- `ADMIN_API_KEY`
- `ASSISTANT_INTERNAL_API_KEY`
- `ASSISTANT_AGENT_API_KEY`

---

## FMP API key in query strings

Financial Modeling Prep requires `apikey` as a query parameter. Mitigations:

- The HTTP client redacts `apikey` from log lines via `sanitizeUrlForLog`.
- Do not enable full-URL access logging on reverse proxies.
- Prefer rotating the FMP key if leakage is suspected.

---

## SSL pinning rotation (mobile)

Pinned hosts are defined in:

- `src/core/api/ssl-pinning.ts`
- `plugins/with-ssl-pinning.js`

When Railway renews certificates:

1. Extract the new SPKI hash for the API hostname.
2. Update the native pinning configuration in the config plugin / native module.
3. Ship a new app build before the old certificate expires.

Until native public-key pinning is wired, the plugin enforces ATS (iOS) and disables cleartext traffic (Android) for pinned hosts.

---

## Logging policy

- Production (`APP_ENV=pro`): no response payload dumps on schema validation failures.
- Never log `Authorization`, `X-Admin-Api-Key`, `X-Sora-Agent-Api-Key`, or URLs containing `apikey`.
- Keep `INVERSORA_ENV_DEBUG=false` outside local troubleshooting.

---

## Local setup after hardening

### 1. Backend (`inversora-api`)

```bash
# Verify committed local profile
npm run security:verify-local

# Start Postgres with env/local.env (no root .env required for Docker)
npm run db:up

# If you changed POSTGRES_PASSWORD and the container already existed:
npm run db:down
docker volume rm inversora-api_postgres_data
npm run db:up
npm run prisma:migrate:deploy

# Start API
npm run start:local
```

Create a gitignored `.env` with at least `FMP_API_KEY=...` (see `.env.example`). NestJS loads `.env` + `env/local.env`.

### 2. Python agent (optional, local SORA)

```bash
# With NestJS running on :3000
npm run agent:up
# or manually: see agent-service/README.md
```

### 3. Mobile (`invesora`)

```bash
pnpm install
npm run security:verify-plugins   # validates Expo config plugins
npm run test:unit
npm run start:local
```

If `pnpm install` fails with `EPERM` on Windows/OneDrive:

1. Close Expo Metro, emulators, and other Node processes.
2. Retry `pnpm install` from a terminal outside the IDE.
3. As a last resort, move the repo out of OneDrive sync or pause sync temporarily.

### 4. Native production build (SSL pinning)

```bash
cd invesora
pnpm install
set EXPO_PUBLIC_SSL_PINNING_ENABLED=true
npx expo prebuild
```

Ship via EAS with the `pro` profile (`env/pro.env` already sets pinning).

---

## Local development notes

- `env/local.env` ships **placeholder** credentials for isolated Docker use only.
- After pulling changes, update your local `.env` if you use custom admin/agent keys.
- Python agent local curl example:

```bash
curl -X POST http://localhost:8001/agent/respond \
  -H "Content-Type: application/json" \
  -H "X-Sora-Agent-Api-Key: change-me-local-agent-key-16" \
  -d '{"message":"Que es el TER?","surface":"home","locale":"es","context":{}}'
```

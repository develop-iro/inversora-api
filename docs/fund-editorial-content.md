# Fund editorial content

Product copy on fund cards (`badge`, `themeLabel`, `idealForBeginners`) is **not** sourced from FMP. It is persisted on each `funds` row and exposed through the domain model, public listings, BFF detail, and featured endpoints.

Architecture decision: [architecture/adr-003-fund-editorial-fields.md](./architecture/adr-003-fund-editorial-fields.md)

## Source of truth (MVP)

| Layer | Responsibility |
|-------|----------------|
| PostgreSQL `funds.badge`, `funds.themeLabel`, `funds.idealForBeginners` | Per-fund editorial defaults for catalog and detail |
| `src/modules/bff/config/featured-funds-selection.config.ts` | Quarter-specific featured copy (`benefitSummary`, `featuredReason`) and optional badge/theme overrides |
| FMP sync | Metrics only — never overwrites editorial columns |

## API surfaces

### Public read

| Endpoint | Editorial fields |
|----------|------------------|
| `GET /funds` | `editorial.badge`, `editorial.themeLabel`, `editorial.idealForBeginners` on each item |
| `GET /funds?idealForBeginnersOnly=true` | Filters by persisted `idealForBeginners` column |
| BFF `GET /funds/:isin` | Flat `fund.badge`, `fund.themeLabel`, `fund.idealForBeginners` (resolved for display) |
| `GET /featured` | Quarter config overrides badge/theme when present; `idealForBeginners` from DB resolution |

### Admin write

Requires `ADMIN_CATALOG_ENABLED=true` and header `X-Admin-Api-Key` (same as catalog visibility).

```bash
curl -X PATCH "http://localhost:3000/admin/funds/<fund-id>/editorial" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Api-Key: local-dev-admin-key" \
  -d '{
    "badge": "Ideal para empezar",
    "themeLabel": "Multisector global",
    "idealForBeginners": true
  }'
```

All body fields are optional, but at least one must be sent. Partial updates merge into the existing row.

## Translations

MVP stores **Spanish only** in the three columns. When adding locales:

1. Introduce a translation table or JSONB map keyed by BCP-47 locale (`es`, `en`, …).
2. Add `Accept-Language` or `?locale=` to public endpoints.
3. Keep `funds.badge` / `themeLabel` as fallback `es` or migrate to `fund_editorial_translations`.

Document new locale workflow in this file when implemented.

## Initial backfill

Migration `20250615120000_add_fund_editorial_fields`:

- Adds columns with safe defaults.
- Seeds curated ISINs from the MVP featured-funds config.
- Computes `idealForBeginners` for remaining funds using product rules (score ≥ 70, risk ≤ medium, TER ≤ 0.5%).

Apply:

```bash
npm run prisma:migrate:deploy
```

## Caching

Editorial fields change infrequently. No separate CMS cache in MVP — they ride along with fund rows already loaded by services. If a headless CMS is added later, use a short TTL (5–15 minutes) and invalidate on admin PATCH.

## Security

- Public endpoints are read-only.
- Writes go through `AdminApiKeyGuard` + `AdminCatalogEnabledGuard`.
- Do not expose admin routes without TLS and rotated API keys in production.

## Frontend usage

Domain type (app): `invesora/src/core/domain/fund.ts` — map `editorial.*` from `GET /funds` or flat BFF fields from detail/featured responses.

Example list item:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "symbol": "SPY",
  "name": "State Street SPDR S&P 500 ETF Trust",
  "editorial": {
    "badge": "Núcleo USA",
    "themeLabel": "Referencia S&P 500",
    "idealForBeginners": true
  }
}
```

## Related docs

- [catalog-visibility.md](./catalog-visibility.md) — admin authentication pattern
- [bff-fund-detail-contract.md](./bff-fund-detail-contract.md) — mobile fund card contract
- [featured-funds-endpoint.md](./featured-funds-endpoint.md) — quarterly featured selection

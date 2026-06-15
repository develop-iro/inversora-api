# Catalog visibility (RN-05 / HU-37)

The API exposes `catalogVisibility` on fund entities, aligned with the mobile domain type in `invesora/src/core/domain/catalog.ts`.

## States

| State | Public endpoints | Description |
|-------|------------------|-------------|
| `visible` | Included | Fund meets minimum catalog data requirements and may appear in listings, rankings, featured selections, and BFF detail. |
| `quarantined` | Hidden (404) | Incomplete or inconsistent data, or manual review pending. |
| `blocked` | Hidden (404) | Severe issues or out-of-scope products; manual operator decision only. |

## Public filtering

These surfaces return only `visible` funds by default:

- `GET /funds`
- `GET /funds/:id/*` sub-resources
- `GET /rankings`
- `GET /featured`
- BFF fund detail by ISIN

Non-visible funds respond with **404 Not Found** on public detail routes to avoid leaking catalog state.

## Automatic rules

After scoring recalculation, the API evaluates visible funds and may auto-quarantine them when any of these are missing:

- ISIN
- Benchmark
- TER
- Score
- Name

`blocked` and `quarantined` states are never changed automatically; operators promote or block funds through the admin API.

## Admin API

Requires `ADMIN_CATALOG_ENABLED=true` and `ADMIN_API_KEY` (same authentication headers as sync admin).

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/admin/funds` | Paginated listing across all visibility states. Optional `catalogVisibility` filter. |
| `PATCH` | `/admin/funds/:id/catalog-visibility` | Manual state change with audit reason. |
| `PATCH` | `/admin/funds/:id/editorial` | Update product copy (`badge`, `themeLabel`, `idealForBeginners`). |
| `GET` | `/admin/funds/:id/catalog-visibility/audit` | Visibility change history. |

Example:

```bash
curl "http://localhost:3000/admin/funds?catalogVisibility=quarantined" \
  -H "X-Admin-Api-Key: local-dev-admin-key"

curl -X PATCH "http://localhost:3000/admin/funds/<fund-id>/catalog-visibility" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Api-Key: local-dev-admin-key" \
  -d '{"catalogVisibility":"visible","reason":"Reviewed TER and benchmark against provider factsheet"}'
```

## Database

- Column: `funds.catalogVisibility` (`visible` \| `quarantined` \| `blocked`)
- Audit table: `fund_catalog_visibility_audits`
- Migration `20250614120000_add_catalog_visibility` backfills `quarantined` for existing rows missing minimum catalog data.

Apply with:

```bash
npm run prisma:migrate:deploy
```

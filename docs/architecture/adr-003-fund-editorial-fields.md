# ADR-003: Editorial fund fields (badge, themeLabel, idealForBeginners)

## Status

Accepted — 2026-06-15

## Context

Educational copy on fund cards (`badge`, `themeLabel`, `idealForBeginners`) does not come from FMP. The BFF contract already exposes these fields on fund detail, listings, and featured funds, but the API previously returned empty strings or computed booleans at mapping time.

Product needs:

- A single source of truth editable without redeploying the API.
- Spanish copy for the MVP, with a path to translations later.
- Separation from provider sync so FMP updates never overwrite curated text.
- Admin-only write access aligned with existing catalog visibility tooling.

## Decision

### Per-fund editorial fields live in PostgreSQL on `funds`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `badge` | `TEXT` | `''` | Short product badge (e.g. "Ideal para empezar") |
| `themeLabel` | `TEXT` | `''` | Investment theme (e.g. "Multisector global") |
| `idealForBeginners` | `BOOLEAN` | `false` | Editorial beginner suitability flag |

Domain model exposes them as `fund.editorial`. FMP sync **does not** update these columns on upsert.

### Quarterly featured copy stays in versioned config (for now)

`src/modules/bff/config/featured-funds-selection.config.ts` continues to hold quarter-specific fields (`benefitSummary`, `featuredReason`, ISIN selection). At runtime:

- `themeLabel` / `badge` on featured cards prefer quarter config, then fall back to DB editorial.
- `idealForBeginners` is resolved from DB editorial (with metric fallback when copy is empty).

Future CMS can replace the config file without changing HTTP contracts.

### Localization (MVP → future)

- **MVP:** columns store Spanish (`es`) copy only.
- **Future:** add `fund_editorial_translations` (`fundId`, `locale`, `badge`, `themeLabel`) or JSONB `translations` keyed by locale. API will accept `Accept-Language` / `?locale=` when i18n ships.

### Display fallback for `idealForBeginners`

When `badge` and `themeLabel` are both empty (fund not yet curated), BFF computes suitability from score ≥ 70, risk not high, TER ≤ 0.5%. Once product sets editorial copy, the persisted boolean is authoritative.

## Consequences

**Positive**

- Editorial content survives deploys and is queryable (`GET /funds?idealForBeginnersOnly=true`).
- Admin API (`PATCH /admin/funds/:id/editorial`) reuses existing API-key guard.
- Clear split: FMP → metrics; product → editorial; quarter config → featured extras.

**Negative / trade-offs**

- No WYSIWYG CMS in MVP — operators use admin API or SQL/scripts.
- List filter uses the DB column, not the BFF computed fallback (backfill migration sets initial values).
- Translations require a follow-up schema change.

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Headless CMS only | Adds infra, auth, and cache complexity before MVP validation |
| Static seed in repo only | Requires redeploy for every copy change; poor operator UX |
| Compute all fields at runtime | Product cannot override labels; conflicts with curated badges |

## References

- [fund-editorial-content.md](../fund-editorial-content.md) — operations guide
- [bff-fund-detail-contract.md](../bff-fund-detail-contract.md) — mobile field contract
- [featured-funds-endpoint.md](../featured-funds-endpoint.md) — quarterly selection model

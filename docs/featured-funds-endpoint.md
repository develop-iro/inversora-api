# GET /featured — Quarterly featured funds

## Purpose

Exposes manually curated featured funds for the home dashboard carousel and widgets. The mobile app consumes this endpoint instead of local mocks.

## Selection model (MVP)

Featured funds combine:

1. **Manual curation** — Product defines ISINs and quarter-specific copy in `src/modules/bff/config/featured-funds-selection.config.ts`.
2. **Per-fund editorial (DB)** — `badge`, `themeLabel`, and `idealForBeginners` persist on each `funds` row. See [fund-editorial-content.md](./fund-editorial-content.md).
3. **Live hydration** — Each ISIN is loaded from PostgreSQL (name, score, TER, risk, editorial). Funds not yet synced are skipped silently.
4. **In-memory cache** — Responses are cached for five minutes per `(quarter, benchmark, mercado, limit)` key.

Future phases may move selections to CMS or admin tooling without changing the HTTP contract.

## Endpoint

| Method | Path | Module |
|--------|------|--------|
| `GET` | `/featured` | bff |

Swagger: `http://localhost:3000/api/docs` (tag `bff`).

## Query parameters

| Parameter | Required | Format | Description |
|-----------|----------|--------|-------------|
| `quarter` | No | `YYYY-QN` or `Q{1-4} YYYY` | Target quarter. Defaults to current UTC quarter. Example: `2026-Q2` or `Q2 2026`. |
| `limit` | No | Integer 1–20 | Maximum featured funds returned after filters. |
| `benchmark` | No | String | Case-insensitive filter against `categoryLabel` (benchmark text). |
| `mercado` | No | String | Market filter: `global`, `usa`, `europa`, or free-text match on labels. |

## Response

HTTP **200 OK** with:

```json
{
  "quarter": "2026-Q2",
  "quarterTag": "Q2 2026",
  "periodStart": "2026-04-01",
  "periodEnd": "2026-06-30",
  "data": [ /* FeaturedFund[] */ ]
}
```

Each item in `data` matches the `FeaturedFund` contract documented in [bff-fund-detail-contract.md](./bff-fund-detail-contract.md).

### Empty results

Return **200 OK** with `"data": []` when:

- An **explicit** `quarter` query is provided but no curated selection exists for that quarter.
- Curated ISINs are configured but none are synced in PostgreSQL yet.
- Optional filters remove all matches.

When `quarter` is **omitted**, the service defaults to the current UTC quarter. If that quarter has no curation yet, or curation exists but **hydrates to an empty list** (ISINs not synced, blocked catalog, or filters), it **walks back** to older configured quarters until it finds hydrated data. The response metadata (`quarter`, `quarterTag`, etc.) reflects the quarter actually served.

Explicit `quarter` requests never walk back: they return the requested quarter metadata even when `data` is empty.

Do **not** return 404 for empty quarters.

### Errors

| Status | When |
|--------|------|
| **400 Bad Request** | Invalid `quarter` format, invalid `limit`, or other query validation failures. |
| **200 OK** | Valid request, including empty `data`. |

## Examples

### Current quarter (default)

```http
GET /featured
```

### Specific quarter with limit

```http
GET /featured?quarter=2026-Q2&limit=2
```

### Filter by market

```http
GET /featured?quarter=2026-Q2&mercado=usa
```

## Fixture

Example response validated in tests:

- `src/modules/bff/fixtures/featured-funds-q2-2026.fixture.json`

## Related docs

- [bff-fund-detail-contract.md](./bff-fund-detail-contract.md) — `FeaturedFund` field definitions
- [roles-and-responsibilities.md](./roles-and-responsibilities.md) — endpoint ownership

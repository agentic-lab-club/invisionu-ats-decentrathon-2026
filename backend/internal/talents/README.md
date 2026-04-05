# Talents Module Contract

## Purpose

Own admin-only import and read APIs for external talent leads collected by `TalentParser`.

This module does not scrape websites itself. It imports the current in-memory cache snapshot from `TalentParser`, stores a stable copy in PostgreSQL, and exposes backend-owned APIs for the future dashboard page.

## Responsibilities

- Read current scraper cache metadata from `TalentParser /status`.
- Import current scraper cache snapshot from `TalentParser /`.
- Persist imported leads into `talent_leads` with idempotent `UPSERT` by `link`.
- Return saved leads from PostgreSQL for admin UI consumption.
- Return combined backend import status + scraper cache status.

## Out Of Scope

- Running cron jobs or scheduling scraper refreshes.
- Triggering `TalentParser /refresh`.
- Frontend page implementation.
- Editing scraper deduplication logic.

## Why Backend Stores A Snapshot

The frontend must read from backend, not from the scraper directly.

Reasons:
- backend remains the single API surface for the admin dashboard
- imported data survives scraper restarts because it is stored in PostgreSQL
- UI gets stable pagination/filtering from backend-owned endpoints
- backend can keep import behavior idempotent even if the scraper cache already deduplicates items

## Runtime Flow

`TalentParser` keeps its own 24-hour refresh loop in memory.

Import flow:
1. Admin clicks future “Sync from TalentParser” button in dashboard.
2. Frontend calls `POST /talents/sync` on backend.
3. Backend calls `TalentParser /status`.
4. If scraper cache is empty, backend returns an error instead of accidentally triggering a scrape.
5. Backend calls `TalentParser /get_news`.
6. Backend normalizes dates, keeps the raw payload, and upserts rows into `talent_leads` by `link`.
7. Frontend reads saved rows from `GET /talents`.

Important edge case:
- `TalentParser /` currently triggers `refresh_cache()` when its cache is empty.
- To avoid turning backend pull into an implicit scrape, this module always checks `/status` first and aborts when `total = 0`.

## DB Entity

### `talent_leads`

Fields:
- `id`
- `source`
- `link`
- `title`
- `high_school_student_name`
- `published_at`
- `published_date_raw`
- `winner_info`
- `raw_payload`
- `synced_at`

Rules:
- `link` is unique and acts as the business dedupe key
- repeated imports update the existing row instead of creating duplicates
- `published_date_raw` keeps the original scraper date string even when `published_at` is parsed successfully

## Endpoint Overview

### `GET /talents`

Returns stored talent leads from PostgreSQL.

Query params:
- `source` optional
- `query` optional
- `limit` optional, default `50`, max `200`
- `offset` optional, default `0`

Success example:

```json
{
  "items": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "title": "200 школьников стали победителями...",
      "link": "https://daryn.kz/blog/example",
      "source": "Daryn.kz",
      "high_school_student_name": "Имран Кусанов",
      "published_at": "2025-11-29T00:00:00Z",
      "published_date_raw": "29.11.2025",
      "winner_info": "олимпиады...",
      "synced_at": "2026-04-05T14:23:45Z"
    }
  ],
  "total": 247,
  "limit": 50,
  "offset": 0
}
```

### `GET /talents/status`

Returns backend import metadata and current scraper cache metadata.

Success example:

```json
{
  "backend": {
    "total_in_db": 247,
    "last_synced_at": "2026-04-05T14:23:45Z"
  },
  "scraper": {
    "updated_at_utc": "2026-04-05T12:00:00Z",
    "total": 247,
    "sources_scraped": ["Daryn.kz", "Tengrinews"]
  }
}
```

### `POST /talents/sync`

Imports the current scraper cache snapshot without forcing a new scrape.

Success example:

```json
{
  "imported_total": 247,
  "inserted": 12,
  "updated": 235,
  "synced_at": "2026-04-05T14:23:45Z",
  "scraper_updated_at_utc": "2026-04-05T12:00:00Z"
}
```

## Auth / Roles

- All routes require bearer token with role `admin`.

## Error Handling

Status mapping:
- `GET /talents`
  - `400` invalid pagination values
  - `500` repository failure
- `GET /talents/status`
  - `502` scraper is unavailable or returns invalid data
  - `500` repository failure
- `POST /talents/sync`
  - `409` scraper cache is empty
  - `502` scraper is unavailable or returns invalid data
  - `500` import/persistence failure

## Frontend Integration Notes

- The future admin dashboard page must call backend only.
- “Sync from TalentParser” button should call `POST /talents/sync`.
- Talent list page should read `GET /talents`.
- Header widgets / status badges should read `GET /talents/status`.
- Frontend should treat backend as the source of truth after import, not the live scraper cache.

## Config

Backend config section:

```yaml
talent_parser:
  base_url: "http://scraper:9432"
  request_timeout_seconds: 30
```

## Known Limitations

- Sync is manual; backend does not schedule imports.
- `GET /talents/status` depends on scraper availability.
- Search currently covers `title` and `winner_info` only.
- Import updates existing rows on every repeated sync, even if payload content did not change.

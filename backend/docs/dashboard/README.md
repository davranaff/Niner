# Dashboard API (Split Widgets)

Dashboard is intentionally split into independent endpoints.
There is no aggregate `GET /api/v1/dashboard` endpoint.

## Base
- Prefix: `/api/v1`
- Auth: `Authorization: Bearer <access_token>`

## Endpoints

### 1) Activity Heatmap
- `GET /dashboard/activity`
- Query:
  - `year` (optional)
  - `modules` (repeatable): `reading | listening | writing | speaking`

### 2) Stats Cards
- `GET /dashboard/stats`
- Returns:
  - `predicted_overall_band` (IELTS `.0/.5` style)
  - `total_attempts`
  - `minutes_this_week`
  - `current_streak`

### 3) Recent History
- `GET /dashboard/history`
- Query: `modules`, `limit`, `offset`

### 4) Quick Links
- `GET /dashboard/quick-links`
- Returns module cards with real attempt counters (including speaking).

### 5) User Analytics
- `GET /analytics`

## Source-of-Truth Rules
- Submit/finalize writes progress records used by dashboard widgets.
- Reading/listening/speaking sync immediately on submit/finalize.
- Writing sync is completed by async scoring worker once all submitted parts are scored.
- Quick links consume attempt summaries from module exam tables.

## Notes
- Endpoints are designed for parallel frontend loading and per-widget caching.
- See `../exams/README.md` and `../assignments/README.md` for submit/learning lifecycle.

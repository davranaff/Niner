# Dashboard API (Split Endpoints)

The dashboard API is intentionally split into independent endpoints.
There is no aggregate `GET /api/v1/dashboard` endpoint.

## Base
- Prefix: `/api/v1`
- Auth: `Authorization: Bearer <access_token>`

## Endpoints

### 1) Activity Heatmap
- `GET /dashboard/activity`
- Query params:
  - `year` (optional, `int`, default current year)
  - `modules` (optional, repeatable): `reading | listening | speaking | writing`
- Returns:
  - `settings` (selected modules, available modules, available years)
  - `summary` (`practice_days`, `total_attempts`, `total_minutes`)
  - `days` (one item per day of selected year)

Example:
```http
GET /api/v1/dashboard/activity?year=2026&modules=reading&modules=listening
```

### 2) Stats Cards
- `GET /dashboard/stats`
- Query params:
  - `modules` (optional, repeatable)
- Returns:
  - `predicted_overall_band`
  - `total_attempts`
  - `minutes_this_week`
  - `current_streak`

### 3) Recent Attempts History
- `GET /dashboard/history`
- Query params:
  - `modules` (optional, repeatable)
  - `limit` (default `20`)
  - `offset` (default `0`)
- Returns standard offset page:
  - `items`
  - `limit`
  - `offset`

### 4) Quick Links
- `GET /dashboard/quick-links`
- Returns static dashboard navigation shortcuts:
  - Reading
  - Listening
  - Writing
  - Profile

### 5) Analytics (separate from dashboard)
- `GET /analytics`
- Returns user analytics summary (tests count, average/best band, study time, last test date).

## Module Filter Rules
- If `modules` is not passed, all modules are used.
- Supported values:
  - `reading`
  - `listening`
  - `speaking`
  - `writing`

## Notes
- All dashboard endpoints are designed for independent frontend loading.
- This allows parallel requests and easier caching per widget.

See also:
- `../exams/README.md` for attempt lifecycle and scoring.
- `../ai/README.md` for AI summaries shown next to dashboard widgets.

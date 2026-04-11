# Exam Lifecycle

This is the same lifecycle for all exam kinds: `reading`, `listening`, `writing`.

## 1) Create attempt
Endpoint:
- `POST /api/v1/exams/{kind}` with `{ "test_id": <int> }`.

What backend does:
- Checks that the requested test exists.
- Creates an exam attempt bound to the current user from JWT.
- Stores initial state:
  - `started_at = null`
  - `finished_at = null`
  - `finish_reason = null`

## 2) Start attempt (idempotent)
Endpoint:
- `POST /api/v1/exams/{kind}/{exam_id}/start`

What backend does:
- Checks ownership: user can start only own exam.
- If `started_at` is empty, sets it once.
- If already started, returns current exam state without creating duplicates.

## 3) Submit attempt
Endpoints:
- `POST /api/v1/exams/reading/{exam_id}/submit`
- `POST /api/v1/exams/listening/{exam_id}/submit`
- `POST /api/v1/exams/writing/{exam_id}/submit`

Common rules:
- Ownership check is mandatory.
- Full-set validation is mandatory before save.
- If payload is invalid, backend returns `400` and saves nothing.

## 4) Finish exam
On first successful submit:
- `finished_at` is set.
- `time_spent` is calculated in seconds as `finished_at - started_at`.
- `finish_reason`:
  - `time_is_up` when elapsed seconds `>= test.time_limit`
  - `completed` otherwise

Important:
- `time_spent` is not capped to `time_limit`.
- If user submits without explicit `start`, backend sets `started_at = finished_at`, so `time_spent` becomes `0`.

## 5) Re-submit behavior (idempotent)
If exam is already finished:
- backend returns already saved result,
- no recalculation,
- no overwrite.

## 6) View exam history
Endpoint:
- `GET /api/v1/exams/me`
- `GET /api/v1/exams/my-tests`

Returns three sections:
- `reading`
- `listening`
- `writing`

Each section is paginated independently with its own offset.

`/api/v1/exams/my-tests` returns a flat student-facing list with:
- search by test title,
- module/status filters,
- offset/limit pagination,
- ordering (default `-updated_at`).

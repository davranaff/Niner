# Exam Lifecycle

Applies to `reading`, `listening`, `writing`, and `speaking` attempts.

## 1) Create Attempt
- `POST /api/v1/exams/{kind}` with `{ "test_id": <int> }`
- Stores attempt linked to current JWT user.
- Initial state:
  - `started_at = null`
  - `finished_at = null`
  - `finish_reason = null`

## 2) Start Attempt (idempotent)
- `POST /api/v1/exams/{kind}/{exam_id}/start`
- Ownership check is strict.
- `started_at` is set once.
- Repeated `start` returns current state.

## 3) Draft Save vs Final Submit
Strict exam submit and autosave are separated.

Draft endpoints:
- `PUT /api/v1/exams/reading/{exam_id}/draft`
- `PUT /api/v1/exams/listening/{exam_id}/draft`
- `PUT /api/v1/exams/writing/{exam_id}/draft`

Final submit endpoints:
- `POST /api/v1/exams/reading/{exam_id}/submit`
- `POST /api/v1/exams/listening/{exam_id}/submit`
- `POST /api/v1/exams/writing/{exam_id}/submit`

Speaking finalization:
- `POST /api/v1/exams/speaking/{exam_id}/finalize`

## 4) Strict Submit Rules
- Ownership check is mandatory.
- Final submit requires complete payload for the module.
- Invalid payload returns `400 invalid_exam_submission`.
- On strict-submit failure, backend keeps exam data unchanged.

## 5) Finish and Timing
On first successful final submit/finalize:
- `finished_at` is set.
- `time_spent` is computed as `finished_at - started_at` (seconds).
- `finish_reason`:
  - `time_is_up` when elapsed >= limit
  - `completed` otherwise
  - `left` for explicit termination paths

Notes:
- `time_spent` is not capped by module time limit.
- If user submits without explicit start, backend backfills `started_at` and returns valid `time_spent`.

## 6) Re-submit Behavior
- Final submit on finished exam is idempotent.
- Backend returns stored result without rewriting answers.

## 7) Post-Submit Side Effects
After successful finish:
- Progress and analytics are synchronized (`user_progress`, `user_analytics`).
- AI summary auto-trigger is attempted.
- Post-exam assignments are generated from detected mistakes and weak skills.
- Overall exam state transition is updated when attempt belongs to overall-exam flow.

## 8) History Endpoints
- `GET /api/v1/exams/me` (module-separated history)
- `GET /api/v1/exams/my-tests` (flat attempt list with SQL-level filtering/sorting/pagination)

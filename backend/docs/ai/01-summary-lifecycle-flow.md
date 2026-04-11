# AI Summary Lifecycle Flow

This flow applies to modules: `reading`, `listening`, `writing`.

## A) Auto flow after exam submit
1. Student submits exam (`POST /api/v1/exams/{module}/{exam_id}/submit`).
2. Exam result is saved.
3. Backend creates `ai_module_summaries` row:
   - `source=auto_submit`
   - `status=pending`
   - `exam_id=<submitted exam id>`
4. Backend enqueues ARQ job `generate_module_summary(summary_id)`.
5. Worker switches status to `running`, starts writing partial text into `stream_text`.
6. Worker stores final payload (`result_json`, `result_text`) and sets `status=done`.
7. If worker fails: `status=failed`, `error_text` is saved.

## B) Manual flow from API
1. Client calls `POST /api/v1/ai/summaries` with `module` and optional `student_id`.
2. Backend validates access (owner/admin/linked teacher).
3. Backend checks daily limit for manual mode (max 3 per last 24h for `student+module`).
4. If allowed, backend creates pending summary row and enqueues worker.
5. Worker processing is identical to auto flow.

## C) Streaming flow (SSE)
1. Client opens `GET /api/v1/ai/summaries/{id}/stream`.
2. Server emits:
   - `meta`
   - `status` changes
   - `token` chunks while text is generated
   - `done` when successful or `error` when failed
3. Client can also poll `GET /api/v1/ai/summaries/{id}` in parallel.

## D) Idempotency and retries
- Summary rows are immutable jobs; each trigger creates a new row.
- Worker retry policy is configured in ARQ worker settings (`max_tries=3`).
- Failed rows remain available in list/detail APIs for diagnostics.

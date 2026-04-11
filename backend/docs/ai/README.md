# AI Summary Backend (Reading, Listening, Writing)

This folder documents the implemented AI summary system and its operational flows.

## What is implemented
- Auto summary trigger after first successful exam submit.
- Manual summary trigger via API.
- SSE streaming endpoint for real-time summary text updates.
- Access model: owner student, linked teacher, admin.
- Teacher-student binding via one-time invite token (24h TTL).
- Daily manual trigger limit: max 3 requests per user+module in last 24h.
- ARQ worker pipeline with retries and failure state.

## Current behavior details
- Attempt source for summary analytics is **exam attempts tables** only:
  - `reading_exams`
  - `listening_exams`
  - `writing_exams`
- Rows must be finished (`finished_at IS NOT NULL`) to be counted.
- `user_progress` is **not** used as summary attempt source.

## Endpoints
- `POST /api/v1/ai/summaries` - manual trigger (`tags: ai`)
- `GET /api/v1/ai/summaries` - list summaries (`tags: ai`)
- `GET /api/v1/ai/summaries/{id}` - summary detail (`tags: ai`)
- `GET /api/v1/ai/summaries/{id}/stream` - SSE stream (`tags: ai-stream`)

Teacher-student API:
- `POST /api/v1/teacher/students/invites`
- `POST /api/v1/students/me/teacher/accept-invite`
- `GET /api/v1/teacher/students`
- `DELETE /api/v1/teacher/students/{student_id}`
- `DELETE /api/v1/students/me/teacher`

## Files in this folder
- `01-summary-lifecycle-flow.md` - end-to-end flow (auto/manual/stream).
- `02-data-sources-and-calculations.md` - where metrics come from and how they are computed.
- `03-access-and-daily-limits.md` - RBAC, teacher binding, debounce rules.
- `04-worker-retries-and-failures.md` - ARQ execution model and failure handling.
- `streaming.md` - SSE event contract and examples.
- `teacher-student-binding.md` - invite/bind/unbind flow.

## Related code map
- Trigger/list/detail service: `app/modules/ai_summary/services/core.py`
- Data collection/generation: `app/modules/ai_summary/services/generator.py`
- Metrics synthesis: `app/modules/ai_summary/services/analysis.py`
- DB queries: `app/modules/ai_summary/repositories/core.py`
- Worker job: `app/workers/tasks.py::generate_module_summary`
- Queue and worker settings: `app/workers/queue.py`, `app/workers/arq_worker.py`

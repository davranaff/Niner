# AI Worker, Retries, and Failure Modes

## Queueing model
Summary jobs are enqueued from API/service layer to ARQ:
- Queue function: `enqueue_module_summary(summary_id)`
- Job name: `generate_module_summary`

## Retry configuration
Retries are controlled by worker settings:
- `app/workers/arq_worker.py`
- `WorkerSettings.max_tries = 3`

This means ARQ handles retries at worker level for the same job.

## Important implementation note
Queue enqueue call does not pass `_max_tries` as a job kwarg.
This avoids runtime errors like:
- `TypeError: generate_module_summary() got an unexpected keyword argument '_max_tries'`

## Status transitions
`ai_module_summaries.status` transitions:
- `pending` -> `running` -> `done`
- `pending`/`running` -> `failed` (on final error)

Additional fields:
- `stream_text` grows while generation is running.
- `result_json`/`result_text` set on success.
- `error_text` set on failure.

## Client-side recommendation
- Use SSE stream endpoint for live UX.
- On stream error, call detail endpoint and show `error_text`.

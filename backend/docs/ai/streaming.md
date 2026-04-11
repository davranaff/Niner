# AI Summary SSE Streaming

Endpoint:
- `GET /api/v1/ai/summaries/{summary_id}/stream`
- Content-Type: `text/event-stream`

## Access
- Owner student
- Linked teacher
- Admin

## Event order
Typical successful stream:
1. `meta`
2. `status` (`pending` or `running`)
3. `token` (repeated)
4. `status` (`done`)
5. `done`

Failed stream:
1. `meta`
2. `status` (`running` or `failed`)
3. `error`

Heartbeat while pending/running:
- `heartbeat`

## Event payloads
- `meta`: summary metadata (`id`, `user_id`, `module`, `source`)
- `token`: incremental text chunk `{ "text": "..." }`
- `status`: current status `{ "status": "pending|running|done|failed" }`
- `done`: final JSON and text
- `error`: failure payload with message
- `heartbeat`: timestamp ping

## Example stream
```text
event: meta
data: {"id":21,"user_id":3,"module":"reading","source":"manual"}

event: status
data: {"status":"running"}

event: token
data: {"text":"Your latest reading attempts show..."}

event: status
data: {"status":"done"}

event: done
data: {"id":21,"summary_text":"...","result":{...}}
```

## Frontend notes
- Keep one open SSE connection per visible summary.
- Append `token.text` as plain text chunks.
- Use `done`/`error` as terminal events.

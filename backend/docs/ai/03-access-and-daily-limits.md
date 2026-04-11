# AI Summary Access and Daily Limits

## Access model
The same access policy is applied to trigger/list/detail/stream:
- Owner student: can access own summaries.
- Admin: can access any student's summaries.
- Teacher: can access summaries only for linked students.

If access check fails:
- `403 forbidden`

## Teacher-student link prerequisites
Teacher access requires active link in `teacher_student_links`.
Link is created only through invite acceptance flow.

## Manual trigger limit (debounce)
Rule for `POST /api/v1/ai/summaries` when `source=manual`:
- At most **3 manual triggers** per last 24h
- Scope: per `target_user + module`

If exceeded:
- HTTP `409`
- code: `summary_debounce_conflict`
- details: `{ "used": <count>, "limit": 3 }`

## Auto trigger behavior
Auto summaries (`source=auto_submit`) are not blocked by manual debounce.
Each successful exam submit can enqueue its own auto summary job.

## Why this split exists
- Manual limit protects system cost and spam.
- Auto summaries preserve product behavior after exam completion.

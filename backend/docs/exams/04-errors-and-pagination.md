# Errors and Pagination

## A) Unified Error Shape
```json
{
  "code": "invalid_exam_submission",
  "message": "Exam submission payload is invalid"
}
```

## B) Common Error Codes
- `invalid_exam_submission`
- `exam_not_found`
- `forbidden`
- `exam_already_finished`
- `exam_session_mismatch`
- `assignment_not_found`
- module-specific not-found codes (`reading_test_not_found`, `listening_test_not_found`, etc.)

## C) Final Submit Validation Errors
Typical strict-submit failures:
- missing answers/parts
- unknown ids
- duplicate ids
- invalid choice value
- max-words exceeded
- empty essay

All return `400 invalid_exam_submission`.

## D) Pagination Standard
List endpoints use offset pagination:
```json
{
  "items": [],
  "count": 0,
  "limit": 20,
  "offset": 0
}
```

Rules:
- `limit`: `1..100`
- `offset`: `>=0`

## E) `GET /api/v1/exams/me`
Returns module-separated pages:
- `reading`, `listening`, `writing`, `speaking`

Each section has independent offset params and shared `limit`.

## F) `GET /api/v1/exams/my-tests`
Flat attempt list with SQL-level filtering/sorting:
- `search`
- `module=reading|listening|writing|speaking`
- `status=in_progress|completed|terminated`
- `ordering` (default `-updated_at`)
- `offset`
- `limit`

# Errors and Pagination

## A) Unified error shape
Backend returns structured errors in one format:

```json
{
  "code": "invalid_exam_submission",
  "message": "Exam submission payload is invalid",
  "details": [
    { "field": "answers[2].id", "reason": "duplicate_question_id", "value": 123 }
  ]
}
```

## B) Common exam/domain error codes
- `invalid_exam_submission`
- `exam_not_found`
- `forbidden`
- `reading_test_not_found`
- `listening_test_not_found`
- `writing_test_not_found`
- `writing_exam_part_not_found`
- `invalid_admin_payload`

## C) Validation reasons used in `details`
Exam submit reasons:
- `missing_question_answer`
- `unknown_question_id`
- `duplicate_question_id`
- `invalid_option_value`
- `max_words_exceeded`
- `missing_part_essay`
- `unknown_part_id`
- `duplicate_part_id`
- `empty_essay`

Admin payload reasons:
- `invalid_block_type`
- `missing_required_field`
- `options_not_supported_for_block_type`
- `answers_not_supported_for_block_type`
- `single_choice_allows_only_one_correct_option`
- `empty_option_text`
- `empty_correct_answer`

## D) Pagination standard
All list endpoints use `offset + limit`.

Common response shape:

```json
{
  "items": [],
  "limit": 20,
  "offset": 0
}
```

Rules:
- `limit` range: `1..100`.
- `offset` starts at `0`.
- no cursor pagination.

## E) Special pagination for `GET /api/v1/exams/me`
`exams/me` returns three independently paged sections:
- `reading` uses `reading_offset`
- `listening` uses `listening_offset`
- `writing` uses `writing_offset`
- one shared `limit`

Example:

```http
GET /api/v1/exams/me?limit=10&reading_offset=0&listening_offset=20&writing_offset=0
```

## F) Student attempts list for `GET /api/v1/exams/my-tests`
`exams/my-tests` returns one flat list with total count:

```json
{
  "items": [],
  "count": 0,
  "limit": 20,
  "offset": 0
}
```

Supported query params:
- `search`
- `module=reading|listening|writing`
- `status=in_progress|completed|terminated`
- `ordering` (`-updated_at` by default)
- `offset`
- `limit`

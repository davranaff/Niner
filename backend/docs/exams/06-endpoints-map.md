# Endpoints Map (Exam Domain)

This is a practical map of what currently exists in backend for exam-related flows.

## 1) Public catalog endpoints
Reading:
- `GET /api/v1/reading/tests`
- `GET /api/v1/reading/tests/{test_id}`

Listening:
- `GET /api/v1/listening/tests`
- `GET /api/v1/listening/tests/{test_id}`

Writing:
- `GET /api/v1/writing/tests`
- `GET /api/v1/writing/tests/{test_id}`

## 2) Public exam attempt endpoints
Reading:
- `POST /api/v1/exams/reading`
- `POST /api/v1/exams/reading/{exam_id}/start`
- `POST /api/v1/exams/reading/{exam_id}/submit`

Listening:
- `POST /api/v1/exams/listening`
- `POST /api/v1/exams/listening/{exam_id}/start`
- `POST /api/v1/exams/listening/{exam_id}/submit`

Writing:
- `POST /api/v1/exams/writing`
- `POST /api/v1/exams/writing/{exam_id}/start`
- `POST /api/v1/exams/writing/{exam_id}/submit`

History:
- `GET /api/v1/exams/me`
- `GET /api/v1/exams/my-tests`

## 3) Admin endpoints for content and exam control
Reading content:
- `GET /api/v1/admin/reading/tests`
- `POST /api/v1/admin/reading/tests`
- `GET /api/v1/admin/reading/tests/{test_id}`
- `PATCH /api/v1/admin/reading/tests/{test_id}`
- `DELETE /api/v1/admin/reading/tests/{test_id}`
- `POST /api/v1/admin/reading/tests/{test_id}/passages`
- `PATCH /api/v1/admin/reading/passages/{passage_id}`
- `DELETE /api/v1/admin/reading/passages/{passage_id}`
- `POST /api/v1/admin/reading/passages/{passage_id}/blocks`
- `PATCH /api/v1/admin/reading/blocks/{block_id}`
- `DELETE /api/v1/admin/reading/blocks/{block_id}`
- `POST /api/v1/admin/reading/blocks/{block_id}/questions`
- `PATCH /api/v1/admin/reading/questions/{question_id}`
- `DELETE /api/v1/admin/reading/questions/{question_id}`
- `POST /api/v1/admin/reading/questions/{question_id}/options`
- `PATCH /api/v1/admin/reading/options/{option_id}`
- `DELETE /api/v1/admin/reading/options/{option_id}`
- `POST /api/v1/admin/reading/questions/{question_id}/answers`
- `PATCH /api/v1/admin/reading/answers/{answer_id}`
- `DELETE /api/v1/admin/reading/answers/{answer_id}`

Listening content:
- `GET /api/v1/admin/listening/tests`
- `POST /api/v1/admin/listening/tests`
- `PATCH /api/v1/admin/listening/tests/{test_id}`
- `DELETE /api/v1/admin/listening/tests/{test_id}`
- `POST /api/v1/admin/listening/tests/{test_id}/parts`
- `PATCH /api/v1/admin/listening/parts/{part_id}`
- `DELETE /api/v1/admin/listening/parts/{part_id}`
- `POST /api/v1/admin/listening/parts/{part_id}/blocks`
- `PATCH /api/v1/admin/listening/blocks/{block_id}`
- `DELETE /api/v1/admin/listening/blocks/{block_id}`
- `POST /api/v1/admin/listening/blocks/{block_id}/questions`
- `PATCH /api/v1/admin/listening/questions/{question_id}`
- `DELETE /api/v1/admin/listening/questions/{question_id}`
- `POST /api/v1/admin/listening/questions/{question_id}/options`
- `PATCH /api/v1/admin/listening/options/{option_id}`
- `DELETE /api/v1/admin/listening/options/{option_id}`
- `POST /api/v1/admin/listening/questions/{question_id}/answers`
- `PATCH /api/v1/admin/listening/answers/{answer_id}`
- `DELETE /api/v1/admin/listening/answers/{answer_id}`

Writing content:
- `GET /api/v1/admin/writing/tests`
- `POST /api/v1/admin/writing/tests`
- `PATCH /api/v1/admin/writing/tests/{test_id}`
- `DELETE /api/v1/admin/writing/tests/{test_id}`
- `POST /api/v1/admin/writing/tests/{test_id}/parts`
- `PATCH /api/v1/admin/writing/parts/{part_id}`
- `DELETE /api/v1/admin/writing/parts/{part_id}`

Exam management:
- `GET /api/v1/admin/exams/{kind}`
- `GET /api/v1/admin/exams/{kind}/{exam_id}`
- `PATCH /api/v1/admin/exams/writing/parts/{exam_part_id}/review`

## 4) Worker jobs tied to exam domain
- `parse_table_completion`:
  - parses table text into `table_json` for reading/listening blocks,
  - status flow `pending -> done` or `pending -> failed`, with retries.

- `evaluate_writing_exam_part`:
  - generates IELTS-style writing feedback and estimated band,
  - writes `score` and `corrections` for writing exam part,
  - respects manual review (`is_checked=true` is not overwritten).

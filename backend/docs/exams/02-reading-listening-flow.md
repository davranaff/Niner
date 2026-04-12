# Reading and Listening Flow

Covers objective modules: `reading` and `listening`.

## A) Catalog Endpoints
Reading:
- `GET /api/v1/reading/tests`
- `GET /api/v1/reading/tests/{test_id}`

Listening:
- `GET /api/v1/listening/tests`
- `GET /api/v1/listening/tests/{test_id}`

Both use offset pagination (`limit`, `offset`).

## B) Attempt Endpoints
Reading:
- `POST /api/v1/exams/reading`
- `POST /api/v1/exams/reading/{exam_id}/start`
- `PUT /api/v1/exams/reading/{exam_id}/draft`
- `POST /api/v1/exams/reading/{exam_id}/submit`

Listening:
- `POST /api/v1/exams/listening`
- `POST /api/v1/exams/listening/{exam_id}/start`
- `PUT /api/v1/exams/listening/{exam_id}/draft`
- `POST /api/v1/exams/listening/{exam_id}/submit`

## C) Payload Format
```json
[
  { "id": 101, "value": "B" },
  { "id": 102, "value": "Not Given" }
]
```

## D) Validation Policy
Final submit is strict:
- full question set is required
- unknown/duplicate question ids are rejected
- invalid option values are rejected for single-choice blocks
- max-words constraints are enforced for text blocks

Draft save is partial:
- accepts incomplete answer sets
- keeps the same schema and validation for known ids/options

## E) Answer Matching Normalization
Objective checking is not raw string equality.
Current matching normalizes:
- case
- punctuation/noise symbols
- whitespace
- basic article handling in multi-token answers (`a/an/the`)
- equivalent variants split by `/`, `or`, `;`, `|`

## F) Scoring
Raw correct count is converted via module-specific IELTS maps:
- Reading: `reading_band_score(raw)`
- Listening: `listening_band_score(raw)`

Reading and listening mappings are intentionally separate.
Reported bands use IELTS rounding (`.0/.5`).

## G) Idempotency
- repeated `start` keeps original `started_at`
- repeated final `submit` after finish returns persisted result
- draft saves remain available only for unfinished attempts

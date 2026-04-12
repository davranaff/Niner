# Writing Flow

Writing shares lifecycle semantics with other modules but has dedicated scoring and review behavior.

## A) Catalog Endpoints
- `GET /api/v1/writing/tests`
- `GET /api/v1/writing/tests/{test_id}`

Detail includes writing parts (`parts` / alias `writing_parts`) with task assets.

## B) Attempt Endpoints
- `POST /api/v1/exams/writing`
- `POST /api/v1/exams/writing/{exam_id}/start`
- `PUT /api/v1/exams/writing/{exam_id}/draft`
- `POST /api/v1/exams/writing/{exam_id}/submit`

## C) Payload
```json
[
  { "part_id": 201, "essay": "Task 1 response..." },
  { "part_id": 202, "essay": "Task 2 response..." }
]
```

## D) Validation
Final submit is strict:
- full set of writing parts is required
- unknown/duplicate `part_id` is rejected
- empty essay after trim is rejected

Draft save is partial and keeps in-progress text only.

## E) Scoring Model
- Writing band uses weighted aggregation:
  - Task 1 weight = 1
  - Task 2 weight = 2
- Final writing band is rounded by IELTS rule (`.0/.5`).
- If part scores are not ready yet, writing band can remain `null` until evaluation completes.

## F) Evaluation Pipeline
After submit:
- each writing part is saved as `WritingExamPart`
- async ARQ jobs (`evaluate_writing_exam_part`) are enqueued
- AI/manual review writes `score` + `corrections`
- when all submitted parts have scores and exam is already finished, worker syncs:
  - `UserProgress` / `UserAnalytics` (writing band + study time)
  - post-exam assignments regeneration for score-dependent gaps

Admin manual review endpoint:
- `PATCH /api/v1/admin/exams/writing/parts/{exam_part_id}/review`

## G) Post-Exam Personalization
Writing submit/result flow generates post-exam assignments for:
- low response length
- low-quality scored parts (when scores are available)

Assignments are idempotent and linked to source attempt.
Score-dependent assignments are also refreshed by worker after async scoring finishes.

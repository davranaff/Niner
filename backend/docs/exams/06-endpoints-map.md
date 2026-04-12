# Endpoints Map (Exam Domain)

## 1) Public Catalog Endpoints
Reading:
- `GET /api/v1/reading/tests`
- `GET /api/v1/reading/tests/{test_id}`

Listening:
- `GET /api/v1/listening/tests`
- `GET /api/v1/listening/tests/{test_id}`

Writing:
- `GET /api/v1/writing/tests`
- `GET /api/v1/writing/tests/{test_id}`

Speaking:
- `GET /api/v1/speaking/tests`
- `GET /api/v1/speaking/tests/{test_id}`
- `POST /api/v1/speaking/tts`
- `WS /api/v1/speaking/live/{exam_id}`

## 2) Public Attempt Endpoints
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

Writing:
- `POST /api/v1/exams/writing`
- `POST /api/v1/exams/writing/{exam_id}/start`
- `PUT /api/v1/exams/writing/{exam_id}/draft`
- `POST /api/v1/exams/writing/{exam_id}/submit`

Speaking:
- `POST /api/v1/exams/speaking`
- `POST /api/v1/exams/speaking/{exam_id}/start`
- `GET /api/v1/exams/speaking/{exam_id}/session`
- `PUT /api/v1/exams/speaking/{exam_id}/session`
- `POST /api/v1/exams/speaking/{exam_id}/examiner-decision`
- `POST /api/v1/exams/speaking/{exam_id}/finalize`

History:
- `GET /api/v1/exams/me`
- `GET /api/v1/exams/my-tests`

Overall exam orchestration:
- `POST /api/v1/exams/overall`
- `GET /api/v1/exams/overall`
- `GET /api/v1/exams/overall/{overall_id}`
- `POST /api/v1/exams/overall/{overall_id}/start-module`
- `POST /api/v1/exams/overall/{overall_id}/break/skip`
- `POST /api/v1/exams/overall/{overall_id}/terminate`

## 3) Post-Exam Assignment Endpoints
- `GET /api/v1/assignments`
- `GET /api/v1/assignments/{assignment_id}`
- `POST /api/v1/assignments/{assignment_id}/attempts`

## 4) Teacher Analytics Endpoints
- `GET /api/v1/teacher/dashboard`
- `GET /api/v1/teacher/analytics`
- `GET /api/v1/teacher/students/insights`
- `GET /api/v1/teacher/students/{student_id}/insights`

## 5) Admin Endpoints (Exam Control + Content)
- `GET /api/v1/admin/exams/{kind}`
- `GET /api/v1/admin/exams/{kind}/{exam_id}`
- `PATCH /api/v1/admin/exams/writing/parts/{exam_part_id}/review`

Reading/listening/writing content management endpoints remain under `/api/v1/admin/{module}/...`.

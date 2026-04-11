# Teacher-Student Binding

## Purpose
Teacher binding controls which teacher can view and trigger AI summaries for a student.

## Endpoints
- `POST /api/v1/teacher/students/invites`
- `POST /api/v1/students/me/teacher/accept-invite`
- `GET /api/v1/teacher/students`
- `DELETE /api/v1/teacher/students/{student_id}`
- `DELETE /api/v1/students/me/teacher`

## Invite response payload
`POST /api/v1/teacher/students/invites` returns:
- `invite_token`
- `invite_link`
- `expires_at`

`invite_link` contains query params for frontend onboarding:
- `token`
- `teacher_id`
- `teacher_email`

## Rules
- Invite token is one-time and expires in 24 hours.
- Student can have only one active teacher link.
- Teacher access to summaries is only for linked students.
- Admin can access all students and all summaries.

## Invite flow
1. Teacher creates invite token.
2. Student accepts token.
3. System validates: token exists, unused, not expired, student has no active link.
4. System creates `teacher_student_links` row.
5. Invite is marked used (`used_at`, `used_by_student_id`).

## Unbind flow
- Teacher can remove link for a specific student.
- Student can remove own teacher link.
- After unbind, teacher immediately loses access to student's AI summary endpoints.

## Error codes
- `invalid_invite` for missing/used/expired token.
- `teacher_already_linked` when student already linked.
- `forbidden` for role/access violations.
- `link_not_found` when trying to unbind a missing link.

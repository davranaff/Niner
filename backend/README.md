# Bandnine Backend v1

## Stack
- FastAPI + Pydantic v2
- SQLAlchemy Async + Alembic
- PostgreSQL + Redis
- ARQ background workers
- JWT auth (access + refresh with revocation)

## Quick Start
Run commands from project root (`../` from this directory).

1. Copy env:
   ```bash
   cp .env.example .env
   ```
2. Start containers:
   ```bash
   docker compose up --build
   ```
3. Apply migrations:
   ```bash
   docker compose exec api alembic upgrade head
   ```
4. Seed data:
   ```bash
   docker compose exec api python -m app.scripts.seed
   ```

## Demo Fixtures (YAML)
Demo fixtures are stored in `app/fixtures/demo/*.yaml` and loaded by `app.scripts.seed`.

Included fixture files:
- `users.yaml`
- `profiles.yaml`
- `progress.yaml`
- `lessons.yaml`
- `reading_tests.yaml`
- `listening_tests.yaml`
- `writing_tests.yaml`

Default demo users (exactly 3):
- `admin.demo@bandnine.uz` / `AdminDemo123` (admin)
- `teacher.demo@bandnine.uz` / `TeacherDemo123` (teacher)
- `student.demo@bandnine.uz` / `StudentDemo123` (student)

## API
- Base prefix: `/api/v1`
- Swagger: `http://localhost:8000/docs`

## Documentation
- Docs index: `backend/docs/README.md`
- Exams lifecycle + scoring + endpoints: `backend/docs/exams/README.md`
- Post-exam assignments domain: `backend/docs/assignments/README.md`
- AI Summary + Teacher Binding + SSE: `backend/docs/ai/README.md`
- Dashboard contracts: `backend/docs/dashboard/README.md`

## Auth
- Access token: 15 min
- Refresh token: 30 days
- Header: `Authorization: Bearer <access_token>`
- Sign-up role must be `student` or `teacher`.

## Worker
Run background parser worker:
```bash
arq app.workers.arq_worker.WorkerSettings
```

## Tests
```bash
make test
```

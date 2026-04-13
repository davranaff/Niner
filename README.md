# Bandnine

![Bandnine 9.0](<assets/band 9.0.svg>)

Bandnine is an IELTS-focused learning platform with a FastAPI backend, a React student and teacher application, background workers, and a separate landing app. The platform covers reading, listening, writing, speaking, AI summaries, post-exam weak-area assignments, generated recovery tests, teacher analytics, and progress dashboards.

## Project Structure

- `backend/` - FastAPI API, async SQLAlchemy models, Alembic migrations, ARQ workers, fixtures, and backend docs.
- `frontend/` - React application for students and teachers.
- `bandnine-landing/` - separate public landing site.
- `assets/` - shared repository assets, including the `band 9.0.svg` artwork used in this README.
- `docker-compose.yml` - local development stack.
- `docker-compose.prod.yml` - production-oriented stack with Caddy and landing app.

## Stack

- Backend: FastAPI, Pydantic v2, SQLAlchemy Async, Alembic, PostgreSQL, Redis, ARQ.
- Frontend: React 18, TypeScript, MUI, TanStack Query, i18next.
- Infra: Docker Compose for development and production orchestration.
- AI and workers: OpenAI-backed evaluation and summary flows, plus ARQ retryable jobs.

## Development Flow

This is the recommended local startup flow from the project root.

1. Create the main environment file.

```bash
cp .env.example .env
```

2. Create the frontend env file expected by `docker-compose.yml`.

```bash
touch frontend/.env
```

3. Start the local stack.

```bash
docker compose up --build -d
```

4. Apply database migrations.

```bash
docker compose exec api alembic upgrade head
```

5. Seed the demo data.

```bash
docker compose exec api python -m app.scripts.seed
```

6. Open the main services.

- App: `http://localhost:3000`
- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

7. When you change worker code, restart the worker so ARQ loads the new task registry.

```bash
docker compose restart worker
```

## Makefile Shortcuts

The repository already provides wrapper commands in `Makefile`.

```bash
make up
make upgrade
make seed
make logs
make test
```

## Production Flow

1. Create the production environment file.

```bash
cp .env.prod.example .env.prod
```

2. Start the production stack.

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up --build -d
```

3. Run production migrations.

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T api alembic upgrade head
```

4. Inspect logs if needed.

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f api frontend landing worker caddy
```

## Demo Data

Demo fixtures live in `backend/app/fixtures/demo/*.yaml` and are loaded by `backend/app/scripts/seed.py`.

Default demo users:

- `admin.demo@bandnine.uz` / `AdminDemo123`
- `teacher.demo@bandnine.uz` / `TeacherDemo123`
- `student.demo@bandnine.uz` / `StudentDemo123`

## Testing

Backend:

```bash
pytest backend/app/tests -q
```

Frontend:

```bash
cd frontend && npm run build
```

## Documentation Index

The repository already contains several domain docs. The list below mentions every current docs or README file discovered in the project.

### Main READMEs

- [README.md](README.md) - root project overview, startup flow, and documentation map.
- [backend/README.md](backend/README.md) - backend quick start, fixtures, auth, worker, and API notes.
- [frontend/README.md](frontend/README.md) - frontend package manager and local run notes.
- [bandnine-landing/README.md](bandnine-landing/README.md) - landing app README inherited from its Vite setup.

### Backend Docs Index

- [backend/docs/README.md](backend/docs/README.md) - entry point for backend documentation domains and reading order.

### Exam Docs

- [backend/docs/exams/README.md](backend/docs/exams/README.md) - exam-domain overview and file map.
- [backend/docs/exams/01-lifecycle.md](backend/docs/exams/01-lifecycle.md) - attempt lifecycle across reading, listening, writing, and speaking.
- [backend/docs/exams/02-reading-listening-flow.md](backend/docs/exams/02-reading-listening-flow.md) - objective module flow for reading and listening.
- [backend/docs/exams/03-writing-flow.md](backend/docs/exams/03-writing-flow.md) - writing-specific catalog, attempt, and review flow.
- [backend/docs/exams/04-errors-and-pagination.md](backend/docs/exams/04-errors-and-pagination.md) - unified error shape and pagination behavior.
- [backend/docs/exams/05-test-types.md](backend/docs/exams/05-test-types.md) - supported reading, listening, writing, and speaking task types.
- [backend/docs/exams/06-endpoints-map.md](backend/docs/exams/06-endpoints-map.md) - consolidated endpoint map for the exam domain.

### Assignment Docs

- [backend/docs/assignments/README.md](backend/docs/assignments/README.md) - post-exam error tracking, skill gaps, assignments, and attempts.

### Dashboard Docs

- [backend/docs/dashboard/README.md](backend/docs/dashboard/README.md) - split dashboard widgets and backend source-of-truth rules.

### AI Docs

- [backend/docs/ai/README.md](backend/docs/ai/README.md) - AI summary backend overview.
- [backend/docs/ai/01-summary-lifecycle-flow.md](backend/docs/ai/01-summary-lifecycle-flow.md) - automatic and manual summary generation lifecycle.
- [backend/docs/ai/02-data-sources-and-calculations.md](backend/docs/ai/02-data-sources-and-calculations.md) - source tables, ordering, and calculations used by summaries.
- [backend/docs/ai/03-access-and-daily-limits.md](backend/docs/ai/03-access-and-daily-limits.md) - access rules, linked-teacher scope, and daily trigger limits.
- [backend/docs/ai/04-worker-retries-and-failures.md](backend/docs/ai/04-worker-retries-and-failures.md) - ARQ worker queueing, retries, and failure handling.
- [backend/docs/ai/streaming.md](backend/docs/ai/streaming.md) - SSE summary streaming contract.
- [backend/docs/ai/teacher-student-binding.md](backend/docs/ai/teacher-student-binding.md) - invite and relationship model for teacher-student binding.

## Environment Files

- [.env.example](.env.example) - local development environment template.
- [.env.prod.example](.env.prod.example) - production environment template.

## Notes

- Python base image is `python:3.12-slim`.
- Frontend production image is built with Node 20.
- The local stack expects PostgreSQL and Redis through Docker Compose.
- Worker-backed features such as AI summaries, parsing, and weak-area test generation depend on the `worker` service being up.

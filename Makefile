.PHONY: install lint test migrate upgrade seed seed-local run worker up down down-v logs restart

APP_DIR=backend
PYTHON ?= python3
PIP ?= $(PYTHON) -m pip
COMPOSE ?= docker compose
API_SERVICE ?= api
WORKER_SERVICE ?= worker

install:
	$(COMPOSE) build

lint:
	$(COMPOSE) run --rm $(API_SERVICE) ruff check .

test:
	$(COMPOSE) run --rm -e TEST_DATABASE_URL=sqlite+aiosqlite:///./test.db $(API_SERVICE) pytest -q

migrate:
	cd $(APP_DIR) && alembic revision --autogenerate -m "auto"

upgrade:
	$(COMPOSE) exec -T $(API_SERVICE) alembic upgrade head

seed:
	$(COMPOSE) up -d postgres redis $(API_SERVICE)
	$(COMPOSE) exec -T $(API_SERVICE) python -m app.scripts.seed

seed-local:
	$(COMPOSE) up -d postgres redis $(API_SERVICE)
	$(COMPOSE) exec -T $(API_SERVICE) python -m app.scripts.seed

run:
	$(COMPOSE) up $(API_SERVICE)

worker:
	$(COMPOSE) up $(WORKER_SERVICE)

up:
	$(COMPOSE) up --build -d

down:
	$(COMPOSE) down

down-v:
	$(COMPOSE) down -v

logs:
	$(COMPOSE) logs -f api frontend worker

restart:
	$(COMPOSE) down
	$(COMPOSE) up --build -d

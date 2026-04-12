# Production Deployment (Backend + Frontend + Landing)

## 1) DNS records
Create these DNS records and point them to your server IP:

- `A bandnine.online -> <SERVER_IP>`
- `A ilets.bandnine.online -> <SERVER_IP>`
- `A api.bandnine.online -> <SERVER_IP>`

## 2) Open firewall ports
Allow inbound ports:

- `800/tcp` (HTTP container port published as host `800`)
- `4430/tcp` (HTTPS container port published as host `4430`)
- Optional direct service ports from `.env.prod` (`18000`, `30000`, `31000`, etc.)

## 3) Prepare env
From project root:

```bash
cp .env.prod.example .env.prod
```

Then edit `.env.prod` and set real secrets:

- `SECRET_KEY`
- `POSTGRES_PASSWORD`
- SMTP credentials
- `OPENAI_API_KEY`

## 4) First deploy

```bash
./scripts/prod/deploy.sh
```

What this does:

- validates ports (must be `1..65535`)
- builds and starts all production containers
- applies Alembic migrations
- prints running services

## 5) Update deploy (pull + rebuild + migrate)

```bash
./scripts/prod/update.sh
```

Default branch is `main`. To use another branch:

```bash
BRANCH=develop ./scripts/prod/update.sh
```

## 6) Domains routing
Handled by Caddy (`deploy/prod/Caddyfile`) with SSL:

- `https://bandnine.online:4430` -> landing
- `https://ilets.bandnine.online:4430` -> frontend
- `https://api.bandnine.online:4430` -> backend API

Important: since host HTTPS port is `4430`, URLs must include `:4430` (including frontend API origin and backend CORS origins in `.env.prod`).

## Notes about ports
Requested port style "add one zero" is kept where valid (for example `3000 -> 30000`).
`8000 -> 80000` is not possible because TCP max port is `65535`, so API defaults to `18000`.
You can change all ports in `.env.prod`.

# Web of Devs — Server

NestJS REST API for [Web of Devs](https://webofdevs.com). It serves the directory of developer sites (entries, favorites, reports), handles GitHub OAuth, and runs the scheduled GitHub scraper that keeps user metadata, languages, and star counts current.

For the high-level architecture, see the [root README](../README.md).

## Stack

- **NestJS 11** on Node.js (see `.node-version`)
- **PostgreSQL** via [`knex`](https://knexjs.org/) + [`nestjs-knex`](https://github.com/svtslv/nestjs-knex)
- **Redis** + [`@nestjs/bullmq`](https://docs.nestjs.com/techniques/queues) for the scraper job queue
- **GitHub OAuth** with JWT access tokens and rotating refresh tokens (`@nestjs/jwt`, `passport-jwt`)
- GitHub REST API calls for the scraper, [`@nestjs/schedule`](https://docs.nestjs.com/techniques/task-scheduling) for cron, [`@nestjs/throttler`](https://docs.nestjs.com/security/rate-limiting) and `helmet` for hardening

## Prerequisites

- Node.js (matching `../.node-version`)
- Docker (for local Postgres + Redis via `docker-compose.dev.yml`)
- A GitHub OAuth app for local sign-in

## Setup

```bash
npm install
cp .env.template .env   # then fill in real values
docker compose -f docker-compose.dev.yml up -d
```

The compose file starts Postgres on `localhost:5434` and Redis on `localhost:6380`, both with username/password `webofdevs`.

## Run

```bash
npm run start:dev   # watch mode, default port 9000 (matches client VITE_API_URL)
npm run build       # compile to dist/
npm start           # web/default: runs migrations then starts; worker: starts without migrations
npm test            # unit tests
npm run test:e2e    # end-to-end tests
```

## Environment variables

Required (see `.env.template`):

- `DB_HOST`, `DB_PORT`, `DB_DATABASE_NAME`, `DB_USER`, `DB_PASSWORD` — Postgres connection
- `DB_SSL` — set to `"true"` to enable SSL (production)
- `JWT_SECRET` — signs access and refresh tokens
- `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, `GITHUB_OAUTH_REDIRECT_URI` — GitHub OAuth app
- `GITHUB_OCTOKIT_TOKEN` — token used by the scraper to call the GitHub API
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD` — BullMQ queue backend
- `CORS_ORIGINS` — comma-separated list of allowed origins (e.g. `http://localhost:3000`)
- `ENABLE_SCHEDULED_SCRAPER` — set to `"true"` only on the worker service that should run cron jobs and the BullMQ scraper worker

## Migrations

Schema is managed by Knex. Migrations live in [`migrations/`](migrations) and run against the compiled output in `dist/`.

```bash
npm run build
npm run migrate     # knex migrate:latest against dist/knexfile.js
```

`npm start` runs `npm run migrate` automatically before booting the web/default service. When `ENABLE_SCHEDULED_SCRAPER="true"`, the process is treated as the worker and starts without running migrations.

## How it fits

The SvelteKit client in [`../client`](../client) does not call this API directly from the browser. Its server-side routes act as a backend-for-frontend: they call this API, receive access/refresh tokens in the JSON body, and set them as HttpOnly cookies on the browser response.

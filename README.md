# Bulk URL Health Checker

Bulk URL Health Checker is a TypeScript monorepo that accepts a list of URLs, stores a batch in PostgreSQL, queues one background job per URL in Redis, and records the result of each HTTP check. A Next.js web app provides the submission and batch summary screens.

## System Overview

The repository contains four workspace packages:

- `apps/api`: Fastify HTTP API. Creates batches, reads batch summaries, and publishes URL-check jobs.
- `apps/worker`: BullMQ worker. Fetches each URL and writes the result to PostgreSQL.
- `apps/web`: Next.js App Router frontend for submitting URLs and viewing batch status.
- `packages/shared`: Shared TypeScript enums and data types.

Runtime dependencies:

- PostgreSQL, currently intended for Neon or another PostgreSQL-compatible provider.
- Redis, used by BullMQ. The included Docker Compose file starts Redis only.
- Node.js `>=18.18.0` and pnpm `9.15.0` (the version declared by `packageManager`).

### Request lifecycle

1. A user enters URLs in the web app. URLs may be separated by newlines or commas.
2. The web app sends `POST /batches` to the API.
3. The API trims and removes blank values, inserts a `batches` row, and queues one `url-check` job per URL.
4. The worker receives each job from Redis and calls the URL with `fetch`, following redirects and timing out after 15 seconds.
5. The worker inserts or updates a `url_checks` row and recalculates the parent batch counters.
6. The web app can read the batch summary from the API.

The API and worker must use the same PostgreSQL database and Redis instance. If the worker is stopped, batches remain pending or running while jobs wait in Redis. A batch accepts at most 1000 unique HTTP or HTTPS URLs.

## Repository Layout

```text
.
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── config/       # Environment parsing
│   │   │   ├── controllers/ # HTTP handlers
│   │   │   ├── db/           # Drizzle client and schema
│   │   │   ├── queues/       # BullMQ producer
│   │   │   ├── repositories/ # PostgreSQL batch access
│   │   │   ├── routes/       # Fastify routes
│   │   │   └── services/     # Batch use cases
│   │   └── drizzle/          # SQL migrations
│   ├── worker/
│   │   └── src/              # BullMQ consumer and URL persistence
│   └── web/
│       ├── app/              # Next.js pages
│       └── lib/api.ts        # API client
├── packages/shared/src/      # Shared batch and URL-check types
├── docker-compose.yml
├── package.json
└── .env.example
```

## Configuration

Create the root environment file:

```powershell
Copy-Item .env.example .env
```

The API and worker explicitly load `../../.env` from their package processes. Keep the file at the repository root when running the workspace scripts.

| Variable              | Required            | Description                                                               |
| --------------------- | ------------------- | ------------------------------------------------------------------------- |
| `NODE_ENV`            | No                  | `development`, `test`, or `production`; defaults to `development`.        |
| `API_PORT`            | No                  | Fastify port; defaults to `4000`.                                         |
| `DATABASE_URL`        | Yes in practice     | PostgreSQL connection string. Neon URLs should include `sslmode=require`. |
| `REDIS_URL`           | Yes in practice     | Redis connection string; local default is `redis://localhost:6379`.       |
| `NEXT_PUBLIC_API_URL` | Yes for the web app | API base URL; local default is `http://localhost:4000`.                   |

Do not commit `.env` or expose database credentials. The checked-in `.env.example` is a template and should contain safe placeholder values in a shared environment.

## Installation and First Run

Install dependencies from the repository root:

```powershell
pnpm install
```

Start Redis:

```powershell
docker compose up -d redis
docker compose ps
```

Apply the current database migrations before starting the API:

```powershell
pnpm db:migrate
```

The migration command reads `apps/api/drizzle.config.ts`, which loads the root `.env`. It creates the `batches`, `url_checks`, and enum objects when they do not already exist.

Start each service in a separate terminal:

```powershell
pnpm dev:api
pnpm dev:worker
pnpm dev:web
```

The local URLs are:

- Web app: `http://localhost:3000`
- API: `http://localhost:4000`
- Redis: `localhost:6379`

The root `pnpm dev` command starts Redis with Docker Compose and then all workspace `dev` scripts in parallel. Docker Desktop must be running.

## Database

Drizzle schema files are in `apps/api/src/db/schema/`. SQL migrations are in `apps/api/drizzle/`.

### `batches`

Stores one row per submission:

- `id`: UUID primary key.
- `status`: `pending`, `running`, `completed`, `failed`, or `cancelled`.
- `total_urls`: number of submitted URLs.
- `completed_urls`: number of successful URL checks.
- `failed_urls`: number of failed URL checks.
- `created_at`, `updated_at`, `completed_at`, `cancelled_at`: timestamps.

### `url_checks`

Stores one URL result per batch:

- `id`: UUID supplied by the queue job.
- `batch_id`: foreign key to `batches`, deleted with its batch.
- `url`: submitted URL.
- `status`: `pending`, `in_progress`, `success`, `failed`, or `skipped`.
- `http_status`: response status when a response was received.
- `response_time`: elapsed time in milliseconds.
- `page_title`: extracted HTML title for responses below HTTP 400.
- `error`: error text or an HTTP failure message.
- `attempt_count`: starts at one and increments on a conflict update.
- `created_at`, `updated_at`, `completed_at`: timestamps.

There is a unique constraint on `(batch_id, url)`, plus indexes on `batch_id` and `url`.

### Schema changes

Edit the Drizzle schema, generate a migration, inspect the generated SQL, then apply it:

```powershell
pnpm db:generate
pnpm db:migrate
```

Never point the API at a database that has not received the migrations. A typical symptom is a `500` response containing `Failed query: select ... from "batches"`.

## API

The API allows CORS from any origin and returns JSON. Unexpected errors are logged by Fastify and returned as HTTP 500 with an `error` and `message` field.

### `GET /health`

Returns API and dependency health. It returns `200` when PostgreSQL and Redis respond, and `503` when either dependency is unavailable.

```json
{
  "ok": true,
  "status": "healthy",
  "dependencies": { "database": "healthy", "redis": "healthy" },
  "timestamp": "2026-08-29T00:00:00.000Z"
}
```

### `POST /batches`

Creates a batch and queues its URLs.

Request:

```http
POST http://localhost:4000/batches
Content-Type: application/json
```

```json
{
  "urls": ["https://example.com", "https://www.google.com"]
}
```

The API trims each string and ignores blank strings. An empty result returns `400`:

```json
{
  "message": "At least one URL is required."
}
```

Successful creation returns `201` and a batch summary:

```json
{
  "data": {
    "id": "9d5f8d5d-6d1b-4978-9bfc-4c1903f4a4df",
    "status": "pending",
    "totalUrls": 2,
    "completedUrls": 0,
    "failedUrls": 0,
    "createdAt": "2026-08-29T00:00:00.000Z",
    "updatedAt": "2026-08-29T00:00:00.000Z",
    "completedAt": null,
    "cancelledAt": null
  }
}
```

PowerShell example:

```powershell
$body = @{ urls = @('https://example.com', 'https://github.com') } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:4000/batches -Method Post -ContentType 'application/json' -Body $body
```

### `GET /batches`

Returns all batches ordered by creation time:

```powershell
Invoke-RestMethod -Uri http://localhost:4000/batches
```

Response shape:

```json
{
  "data": [
    {
      "id": "9d5f8d5d-6d1b-4978-9bfc-4c1903f4a4df",
      "status": "completed",
      "totalUrls": 2,
      "completedUrls": 2,
      "failedUrls": 0,
      "createdAt": "2026-08-29T00:00:00.000Z",
      "updatedAt": "2026-08-29T00:00:05.000Z",
      "completedAt": null,
      "cancelledAt": null
    }
  ]
}
```

### `GET /batches/:batchId`

Returns one batch summary. Unknown batches return `404`; malformed batch IDs return `400`.

```powershell
Invoke-RestMethod -Uri http://localhost:4000/batches/9d5f8d5d-6d1b-4978-9bfc-4c1903f4a4df
```

### `GET /batches/:batchId/urls`

Returns each persisted URL result, including `status`, `httpStatus`, `responseTime`, `pageTitle`, `error`, and `attemptCount`. The detail UI uses this endpoint to render URL-level progress and outcomes.

### `POST /batches/:batchId/cancel`

Cancels a pending or running batch, removes waiting/delayed jobs, and prevents an in-flight result from changing the cancelled batch. The operation is safe to repeat.

### `POST /batches/:batchId/retry-failed`

Requeues only URL rows currently marked `failed`. Successful URL checks are not repeated. The operation is safe when there are no failed URLs.

## Queue and Worker Behavior

The producer and consumer use the BullMQ queue named `url-check`. Each queued job has this payload:

```json
{
  "batchId": "9d5f8d5d-6d1b-4978-9bfc-4c1903f4a4df",
  "urlId": "f924e1b2-0a11-4d87-8d79-8d4f4e196d1d",
  "url": "https://example.com"
}
```

For each job, the worker:

1. Calls the URL with `fetch`, follows redirects, and uses a 15-second timeout.
2. Marks HTTP responses below 400 as `success`; HTTP 400 and above are `failed`.
3. Extracts a `<title>` from successful response bodies.
4. Records network, timeout, and other exceptions as `failed` with no HTTP status.
5. Updates batch counters from the persisted URL-check rows.
6. Sets the batch to `running` until all URLs have results, then to `completed` or `failed`.

The worker logs readiness, errors, and completed jobs. It handles `SIGINT` and `SIGTERM` by closing the BullMQ worker cleanly.

## Web App

The web app uses `NEXT_PUBLIC_API_URL` and defaults to `http://localhost:4000`.

- `/`: submission form with example URLs; accepts newline- or comma-separated input.
- `/`: also accepts a CSV upload; the first CSV column is treated as the URL.
- `/batches`: creates a batch and lists existing batch summaries.
- `/batches/:batchId`: displays aggregate progress and every URL's status, final HTTP status, response time, page title, attempt count, and error.
- The batch detail page includes Cancel batch and Retry failed controls.

The detail page loads the persisted database snapshot first, then subscribes to Server-Sent Events. Events are published through Redis Pub/Sub, so multiple API instances can serve clients. `EventSource` reconnects after a dropped connection; its initial event reloads the current database state, making refreshes and reconnects safe.

## Scripts

Run these commands from the repository root:

| Command            | Purpose                                                     |
| ------------------ | ----------------------------------------------------------- |
| `pnpm install`     | Install workspace dependencies.                             |
| `pnpm dev`         | Run API, worker, and web development processes in parallel. |
| `pnpm dev:api`     | Run the Fastify API with `tsx watch`.                       |
| `pnpm dev:worker`  | Run the BullMQ worker with `tsx watch`.                     |
| `pnpm dev:web`     | Run the Next.js development server.                         |
| `pnpm db:generate` | Generate SQL migrations from Drizzle schemas.               |
| `pnpm db:migrate`  | Apply pending migrations.                                   |
| `pnpm build`       | Build all workspace packages.                               |
| `pnpm test`        | Run the API/worker smoke test against the running stack.    |
| `pnpm typecheck`   | Typecheck all workspace packages.                           |
| `pnpm lint`        | Run ESLint across workspace packages.                       |
| `pnpm format`      | Run Prettier.                                               |

`pnpm dev` starts Redis with Docker Compose and then starts the API, worker, and web app. Docker Desktop must be running. This is the one command for the complete local system:

```powershell
pnpm dev
```

Package-level `build`, `start`, `typecheck`, and API/worker `lint` scripts are also defined in the individual app `package.json` files.

## Troubleshooting

### `GET /batches` returns 500 with `Failed query`

1. Confirm the API is using the root `.env`, not a package-local or default database.
2. Confirm `DATABASE_URL` points to the intended database.
3. Apply migrations:

   ```powershell
   pnpm db:migrate
   ```

4. Restart the API dev process so it reloads configuration.
5. Check the API directly:

   ```powershell
   Invoke-RestMethod -Uri http://localhost:4000/health
   Invoke-RestMethod -Uri http://localhost:4000/batches
   ```

The API and worker load `../../.env` explicitly. Keep that path behavior in mind if moving either app or changing how it is launched.

### Batches stay pending

- Check that Redis is running: `docker compose ps`.
- Check that the worker terminal says `Worker ready and connected to Redis`.
- Confirm API and worker have the same `REDIS_URL`.
- Confirm the worker and API have the same `DATABASE_URL`.

### A batch is failed

Inspect `url_checks.error`, `http_status`, and `response_time` in PostgreSQL. HTTP status 400-499 is treated as a permanent failure. HTTP 5xx responses, DNS failures, connection failures, and 15-second timeouts retry up to three attempts with exponential backoff before being recorded as failed.

### Port already in use

Set another `API_PORT` for the API and update `NEXT_PUBLIC_API_URL` to match. The web app normally runs on port 3000; Next.js will offer another port if 3000 is occupied.

## Design Guarantees and Tradeoffs

- PostgreSQL is the source of truth for batches and URL results. Every URL row is inserted before its BullMQ job is published.
- URL rows use stable UUIDs as job IDs and the `(batch_id, url)` unique constraint makes result writes idempotent.
- BullMQ uses three attempts with exponential backoff. Only transient failures are retried; the final attempt records the result and updates aggregate counters.
- BullMQ global concurrency is set to five. A Redis atomic fixed-window limiter allows at most ten outbound checks per second across worker processes.
- Cancellation removes waiting and delayed jobs. An already-running fetch may finish, but its database write is rejected once the batch is cancelled.
- The batch list uses a Redis cache with a 30-second TTL. Batch creation, worker state changes, cancellation, and retry operations invalidate it, preventing stale list data after known mutations.
- SSE was chosen over polling to reduce repeated reads. Redis Pub/Sub distributes events across API instances, while PostgreSQL snapshot reads make cold loads and reconnects correct.
- The queue publication uses a transactional outbox and a retrying publisher, so an API crash before publication leaves jobs recoverable. A future token-bucket limiter could make traffic smoother than the current fixed-window limiter.

## Horizontal Scaling

Multiple API instances may serve reads and SSE connections because cache, Pub/Sub, and queue coordination use Redis, while PostgreSQL remains authoritative. Multiple worker processes share BullMQ global concurrency and the Redis rate limiter. Running multiple independent Redis or PostgreSQL instances without replication would break these guarantees, so production deployments must use shared highly available services.

## Current Scope

- Authentication, authorization, notifications, and charts are intentionally out of scope.
- CSV upload supports quoted commas and escaped quotes, but treats the first column as the URL and does not expose row-level import diagnostics.
- The API has no authentication, authorization, or job administration UI.

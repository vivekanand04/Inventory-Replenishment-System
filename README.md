### Inventory Replenishment System Backend

**Tech stack**: Node.js, Express, TypeScript, Prisma (PostgreSQL), BullMQ (Redis), Jest, Supertest, pnpm workspaces.

### Setup

- **Install pnpm**: `npm install -g pnpm`
- **Install deps**: `pnpm install`
- **Copy env**: `cp .env.example .env` and fill `DATABASE_URL` and `REDIS_URL`.

### Cloud Postgres provisioning (examples)

- **Neon**:
  - Sign up at `https://neon.tech`.
  - Create a free project and database.
  - Copy the connection string in the format `postgresql://user:password@host:5432/dbname?sslmode=require`.
  - Paste into `.env` as `DATABASE_URL=...`.
- **Supabase**:
  - Sign up at `https://supabase.com`.
  - Create a new project and database.
  - In Database settings, copy the connection string.
  - Paste into `.env` as `DATABASE_URL=...`.

### Cloud Redis provisioning (examples)

- **Upstash**:
  - Sign up at `https://upstash.com`.
  - Create a free Redis database.
  - Copy the public URL in format `rediss://default:password@host:port`.
  - Paste into `.env` as `REDIS_URL=...`.
- **Redis Cloud**:
  - Sign up at `https://redis.io/try-free`.
  - Create a free subscription and database.
  - Copy the connection string and paste into `.env` as `REDIS_URL=...`.

### Database and seed

- **Run migrations**: `pnpm migrate:dev`
- **Seed sample data**: `pnpm seed`

### Run backend

- **API server**: `pnpm dev` (listens on `http://localhost:4000`)
- **Workers**: `pnpm --filter backend run worker`

### Tests and concurrency

- **Run tests**: `pnpm test`
- **Simulate concurrency**: `pnpm simulate:concurrency`

### Docs

- **Architecture**: `ARCHITECTURE.md`
- **Reorder algorithm**: `REORDER_ALGORITHM.md`
- **State machine**: `STATE_MACHINE.md`
- **Failure and rollback**: `FAILURE_AND_ROLLBACK.md`
- **Alert workflow**: `ALERT_WORKFLOW.md`
- **Concurrency**: `CONCURRENCY.md`
- **API spec**: `API_DOCUMENTATION.yaml`


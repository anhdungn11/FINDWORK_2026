# FINDWORK Server — Phase 1

Backend foundation for FINDWORK.

## Stack

- NestJS 12
- TypeScript
- Prisma ORM 7
- PostgreSQL
- REST API under `/api/v1`

The React frontend at the repository root is intentionally unchanged in Phase 1.

## Prerequisites

- Node.js `^20.19`, `^22.12`, or `^24`
- PostgreSQL 15+ (the project owner currently targets PostgreSQL 17)
- An empty development database such as `findwork_dev`

## Local setup

```powershell
cd server
Copy-Item .env.example .env
# Edit .env and set DATABASE_URL to your local PostgreSQL credentials.
npm install
npm run prisma:validate
npm run prisma:generate
```

### Create the initial migration safely

Because this Phase 1 package was prepared without access to your local PostgreSQL credentials, the migration must be generated on the development machine rather than guessed.

```powershell
npx prisma migrate dev --name init --create-only
```

Before applying the migration, append `prisma/sql/phase1_constraints.sql` to the generated `migration.sql`, review the SQL, and then run:

```powershell
npx prisma migrate dev
npm run db:seed
```

## Run

```powershell
npm run start:dev
```

Endpoints:

- `GET http://localhost:3000/api/v1/health`
- Swagger: `http://localhost:3000/api/v1/docs`

## Verification

```powershell
npm run prisma:validate
npm run prisma:generate
npm run build
npm test
npm run db:status
```

The database health endpoint intentionally fails with `503 DATABASE_UNAVAILABLE` when PostgreSQL cannot be reached.

## Architecture boundary

Feature controllers must not call Prisma directly. Future modules follow:

```text
Controller
  -> authentication / authorization guards
  -> service
  -> repository
  -> Prisma
  -> PostgreSQL
```

Prisma types are backend implementation details and must not be imported by the React frontend.

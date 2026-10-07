# Prisma migrations

The schema is committed in Phase 1, but an initial migration is intentionally not fabricated without a real PostgreSQL connection and the local Prisma CLI.

On the development machine:

1. Copy `.env.example` to `.env` and point `DATABASE_URL` at an empty `findwork_dev` database.
2. Run `npm install`.
3. Run `npm run prisma:generate`.
4. Run `npx prisma migrate dev --name init --create-only`.
5. Append the contents of `../sql/phase1_constraints.sql` to the generated `migration.sql` **before applying it**.
6. Review the complete SQL.
7. Run `npx prisma migrate dev` to apply it.
8. Run `npm run db:seed` explicitly.

Do not use `prisma db push` for the production schema.

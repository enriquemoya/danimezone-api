Cloud API Prisma Migrations

- Prisma migrations are the canonical schema source for Neon.
- Use `npm run -w apps/cloud-api prisma:migrate:deploy` for deploys.
- Use `npm run -w apps/cloud-api prisma:migrate:dev` for local development.
- The legacy SQL runner in `scripts/migrate.ts` is deprecated and should not be used.

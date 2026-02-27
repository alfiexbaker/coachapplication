# `@clubroom/db`

Prisma package for the future Clubroom backend API.

## Current state
- `prisma/schema.prisma` is a phase-1 schema skeleton aligned to the backend docs.
- IDs are prefixed strings (generated in API code).
- The schema includes core identity/authz/audit/trust tables plus major product entities.

## Next implementation steps
1. Install workspace dependencies (`pnpm` recommended).
2. Set `DATABASE_URL`.
3. Run `pnpm --filter @clubroom/db prisma:validate`.
4. Split schema into migration-friendly increments by sprint (start with Sprint 00-03 models).
5. Add `@map`/`@@map` for snake_case DB naming if the team wants DB-level naming consistency from day one.

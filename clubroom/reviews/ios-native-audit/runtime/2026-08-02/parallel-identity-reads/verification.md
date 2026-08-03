# Parallel identity reads verification

Date: 2026-08-02

Scope: match squad invitation identity resolution and mock-mode user directory hydration.

## Defect

Independent reads were serialized in two hot paths. Match creation waited before resolving athlete and parent display names, and each athlete name waited before its parent name. Mock user hydration also read the authenticated user record before starting the user-directory read.

## Fix

- Match creation and the complete player-name projection now start together.
- Each athlete and parent name pair resolves concurrently while `Promise.all` preserves squad ordering.
- The mock authenticated-user and user-directory records load concurrently.
- Exact player identity mapping, fallback structure, and the subsequent authoritative invite write are unchanged.

## Verification

- Focused match-invite and user-service tests: 25/25 passed.
- Focused strict TypeScript project: passed.
- Root TypeScript check: passed after unrelated concurrent event-model work settled.
- Focused ESLint and formatting: passed.
- React Doctor diff scan: zero diagnostics.
- Diff check: passed.

Transactional database sequences were deliberately left alone. No production or staging request, database row, Sentry event, permission rule, navigation target, or product copy changed.

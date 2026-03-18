# Clubroom

Football coaching marketplace and coordination app for coaches, families, athletes, and clubs.

## Quick Start

```bash
npm install
npm run dev
```

## Stack

- Expo / React Native app under `app/`
- Fastify API under `apps/api/`
- TypeScript across app, API, and shared contracts
- Expo Router for app routing
- `Result<T, ServiceError>` service pattern

## Repo Shape

```text
clubroom/
├── app/            # Expo Router screens
├── apps/api/       # Fastify API runtime
├── components/     # Shared UI and feature components
├── hooks/          # Screen/view-model hooks
├── services/       # App service layer and domain modules
├── contracts/      # Shared product and governance contracts
├── packages/       # Shared package code
└── docs/           # Current retained docs
```

## Working Rules

- Use `services/api-client.ts` for app data access.
- Use `constants/storage-keys.ts` instead of hardcoded storage keys.
- Route through `navigation/routes.ts`.
- Keep service results on the `ok` / `err` path instead of throw-driven control flow.

## Verification

```bash
npm run typecheck
npm run test:compile
npm --prefix apps/api run typecheck
```

Run targeted tests for the area you touch when the change is non-trivial.

## Canonical Docs

- `docs/START_HERE.md`
- `docs/SOURCE_OF_TRUTH.md`
- `docs/KNOWLEDGE_SPINE.md`
- `docs/architecture/service-ownership-map.md`
- `docs/trust/auth-and-permission-boundaries.md`
- `docs/backend-api/README.md`
- `docs/newsprints/README.md`
- `docs/product-reality/value-shape/MASTER.md`

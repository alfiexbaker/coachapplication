# Pre-API Frontend Refactor Readiness

The following notes capture the highest-impact frontend issues blocking scale, retention, and production readiness. They keep to the current vision in `docs/SOURCE_OF_TRUTH.md` and focus on deepening existing functionality before any backend/API work begins.

## Ten critical issues (plaintext)
1. **Mock-only state**: Booking, messaging, objectives, and payments rely on local mocks with no contract boundaries, so flows break once data diverges from expectations and no role-based validation exists.
2. **Fragile role navigation**: Role tabs and routes are scattered; there is no shared guard for role/child context, causing inconsistent visibility (e.g., parents vs. coaches) and brittle deeplinks/modals.
3. **Inconsistent session lifecycle**: Objectives, attendance, notes, evidence, and actions are not tied into one timeline, so users cannot see progress history or follow-up tasks from a single view.
4. **Storage gaps**: AsyncStorage wrappers silently fall back to memory without surfacing errors, and sensitive data (notes, bookings, auth) lacks encryption, versioning, or migrations.
5. **UI token drift**: Colors, spacing, and typography are hardcoded per screen instead of using shared tokens/components, leading to uneven UX and higher maintenance.
6. **Form and validation debt**: Inputs lack schema validation, default states, and reusable controls; error/loading states are inconsistent across booking, messaging, and profile flows.
7. **Notifications and reminders missing**: There is no cross-surface pattern for announcements, reminders, or confirmations, so users lose context on bookings, objectives, and messages.
8. **No observability**: There is no logging/telemetry pattern to capture client errors, performance, or user journeys, making it hard to diagnose retention/activation issues.
9. **Test desert**: No Jest/RTL coverage for services, hooks, or screens; there are no fixtures or CI commands, so regressions will ship undetected.
10. **Config and environment sprawl**: No environment-driven configuration for endpoints, feature flags, or security settings; builds cannot target different staging/prod behaviors without code changes.

## Pre-API improvements to tackle now
- **Modular data layer**: Wrap booking, messaging, auth, storage, and payments in typed service interfaces with adapters for mocks now and APIs later; enforce role-based access at the service boundary.
- **Navigation hardening**: Centralize role/child guards and deeplink handling in router utilities; ensure modals and tabs read from the same context and redirect unauthenticated/unauthorized users.
- **Session timeline**: Unify objectives, attendance, session notes, and evidence into a single session timeline component with add/edit states and surfaced follow-up actions.
- **Design system pass**: Extract buttons, cards, list items, form controls, spacing/typography tokens, and loading/empty/error primitives; apply across booking, messaging, and profile screens.
- **Forms + validation**: Add shared form hooks with schema validation (zod/yup), optimistic UI helpers, and consistent error/empty/loading banners; standardize keyboard handling on mobile.
- **Storage discipline**: Replace silent fallbacks with explicit error paths, schema/versioning, encryption-ready wrappers, and migration hooks; add smoke tests for reads/writes.
- **Notifications UX**: Add a reusable in-app notification/reminder system and per-screen hooks for booking changes, message mentions, and objective deadlines.
- **Observability hooks**: Introduce guarded logging/telemetry utilities (console + stubbed sink) with user/role context; add screen-level error boundaries.
- **Testing harness**: Configure Jest + React Native Testing Library with aliases and deterministic fixtures; add scripts to lint, test, and format; seed unit tests for services/hooks/screens.
- **Env + feature flags**: Add environment config helpers, feature flag scaffolding, and build-time validation; ensure mocks can be swapped via env without code edits.

## Codex refactor prompt (ready to paste)
You are GPT-5.1-Codex-Max refactoring the **Clubroom** React Native (Expo Router, TypeScript) frontend. Stay aligned to `docs/SOURCE_OF_TRUTH.md` (role-based experiences and four product spines) and do not invent new flows—deepen existing ones.

**Analyze and refactor:**
- Navigation and screens in `app/` (tabs, modals, booking, chat, payments).
- Shared UI and domain components in `components/`.
- State/hooks in `hooks/` and `context/`.
- Domain services in `services/` and data/typing in `constants/`.
- Utilities in `utils/` plus build config (`package.json`, `tsconfig.json`, lint config).

**Goals:**
1) Replace mocks with modular, typed services and adapters; add input validation, role checks, and explicit error handling.
2) Harden navigation and session lifecycle: shared role/child guards, unified session timeline (objectives, attendance, notes, evidence), consistent deeplinks/modals.
3) Apply a design-system pass: central tokens, reusable primitives (buttons/cards/forms/layout), consistent loading/empty/error states, and keyboard-safe forms.
4) Improve retention signals: in-app notifications/reminders for bookings/objectives/messages; surface follow-up tasks and history within booking and session screens.
5) Add observability and configuration: logging/telemetry hooks with user context, error boundaries, env-driven config, and feature-flag scaffolding.
6) Increase testability: add Jest/RTL, fixtures, dependency injection for services/hooks, and CI-friendly `lint`/`test` scripts; add starter tests for services, hooks, and key screens.

**Expectations:**
- Work file-by-file; prefer small diffs and reuse existing patterns.
- Keep UX flows intact while making them more modular and API-ready.
- Add TODOs only with clear follow-up notes and owners.
- Update scripts/config to run tests; document new patterns inline with brief comments.

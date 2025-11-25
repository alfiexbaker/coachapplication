# Frontend Refactor Readiness (integration-ready)

The following notes capture the highest-impact frontend issues blocking scale, retention, and production readiness. They keep to the current vision in `docs/SOURCE_OF_TRUTH.md` and focus on deepening existing functionality while keeping the surfaces ready for future data sources.

## How to use this prompt
1) Re-read `docs/SOURCE_OF_TRUTH.md`, the relevant sprint brief, and `docs/SPINE_CATEGORIES.md` to anchor the role, spine, and acceptance criteria.
2) State the intended outcome in a sentence before touching code (who benefits, what flow, which spine). Reference existing tabs/flows rather than inventing new ones.
3) Identify what can be reused (components, services, tokens) and note why any new surface is unavoidable.
4) Plan tests and observability hooks up front: what should be logged, how to assert the contract, and which screens deserve RTL coverage.
5) Paste the refactor prompt below into your PR/notes and tailor it with the specific flows, guards, and data adapters you are touching.

## Refactor readiness checklist (paste into PR)
- [ ] Roles and spines noted (from `docs/SOURCE_OF_TRUTH.md` + sprint brief)
- [ ] No parallel flows created; reused existing tabs/components where possible
- [ ] Service boundaries typed with adapters/mocks + error paths
- [ ] Navigation/guardrail impact described (deeplinks, role/child context, modals)
- [ ] Design-system tokens and primitives applied (spacing/typography/buttons/cards)
- [ ] Validation + loading/empty/error states wired for changed forms/screens
- [ ] Telemetry/logging hooks with role/user context added or confirmed
- [ ] Tests/fixtures added or updated; scripts runnable in CI

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

## UI/UX and functionality gaps to fix before wiring new data sources
- **Progress evidence that parents trust**: Embed a unified session timeline into existing booking and player views with objective status, attendance, notes, and quick evidence uploads (photos/clip links). Add a parent-friendly snapshot (traffic-light or radar) per player and a coaching pipeline view that rolls up upcoming sessions, overdue objectives, and recent wins.
- **Booking convenience**: Keep everything in one place—no extra tabs. Add inline service selection, availability, and confirmation to the existing booking flow with optimistic updates and clear success/failure states. Surface reminders (in-app toast + badge) for upcoming sessions and approvals.
- **Role clarity and guardrails**: Centralize role/child context so every tab, deeplink, and modal shares the same guard. Parents should only see their player context; coaches see roster + pipeline; admins get tooling without breaking the primary flows.
- **Design-system polish for a 10/10 feel**: Replace screen-local styling with shared tokens and primitives. Standardize spacing, typography, button hierarchy, cards, list rows, and empty/loading/error patterns. Keep keyboard-safe layouts on every form.
- **Inline analytics (no new surfaces)**: Show actionable stats inside the flows users already touch—booking detail should surface objective progress and attendance streaks; player/profile should show recent sessions, goals met, and next actions. Avoid standalone analytics tabs; integrate tiles into home/booking detail screens.
- **Coach-ready ops**: Add quick actions (approve/deny, reschedule, add note/evidence) to session cards. Ensure every action produces a confirmation and is undo-friendly where possible.

## Integration-ready improvements to tackle now
- **Modular data layer**: Wrap booking, messaging, auth, storage, and payments in typed service interfaces with adapters for mocks now and external data sources later; enforce role-based access at the service boundary.
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
You are GPT-5.1-Codex-Max refactoring the **Clubroom** React Native (Expo Router, TypeScript) frontend. Stay aligned to `docs/SOURCE_OF_TRUTH.md` (role-based experiences and four product spines) and do not invent new flows—deepen existing ones while keeping integration smooth for future data sources.

**Single source of truth (before any edits):**
- Re-read `docs/SOURCE_OF_TRUTH.md`, `docs/SPINE_CATEGORIES.md`, and the current sprint notes; summarize the relevant spine, user role, and acceptance criteria inline in the PR/notes.
- Reject changes that create parallel flows or duplicate components/hooks already covered by those documents; refactor toward the documented path instead.
- If the single source of truth is unclear, pause and document the ambiguity (who, what spine, what outcome) before writing code.

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

**Reusability + UX alignment:**
- Keep everything TypeScript-first; shared types/utilities live in reusable files instead of duplicating code across screens or hooks.
- When logic or UI repeats, extract it into modules/components rather than copying—lean code wins over bespoke flows.
- Integrate features into existing tabs/flows instead of creating new tabs; prefer cohesive experiences over fragmentation.
- Pair technical decisions with UX rigor (Tommy’s lens): clarify user goals, reduce clicks, and prefer inline/embedded surfaces to scattered modals.
- Check business viability as you refactor: map each change to a spine-level metric (bookings, retention, trust) and cut anything that does not move those needles.
- Prefer enhancing current flows over adding new features; if you must add a new capability, prove it cannot live inside an existing tab and note the trade-offs.

**Expectations:**
- Work file-by-file; prefer small diffs and reuse existing patterns.
- Keep UX flows intact while making them modular and integration-ready.
- Add TODOs only with clear follow-up notes and owners.
- Update scripts/config to run tests; document new patterns inline with brief comments.

**Execution checklist:**
- Align milestones to the four spines (Community, Booking/Revenue, Development, Trust/Ops) and tag PR notes accordingly.
- For each refactor, capture before/after behavior, contracts introduced, and remaining risks in PR summaries.
- When introducing a service or adapter, include a minimal contract test plus a fixture showing expected inputs/outputs.
- Add at least one screen-level test per modified flow (navigation guard, booking/session actions, messaging) to prevent regressions.
- Ensure design tokens are consumed in updated screens; avoid screen-local colors/spacing unless codified as new tokens.
- Surface new telemetry/logging calls via a shared utility that can be swapped for production sinks; default to no-op in tests.
- Validate env/feature flag usage in CI by adding a sample `.env.example` and a schema check in scripts.
- Document any user-facing toggles or fallback behaviors in `docs/technical/` so later integrations stay aligned.

# Next Step Handoff (2026-03-05)

Canonical sprint reference:
- `docs/newsprints/forms-modals/sprint6-inline-feedback-hardening.md`
- `docs/newsprints/forms-modals/sprint6-closeout.md` (closure + waiver log)

## Sprint 6 Closeout Status (Latest)

- WS4 permission-guidance consistency pass completed across remaining permission-heavy flows.
- Verification gates currently passing:
  - `npm run typecheck`
  - `npm run lint:ui-actions`
  - `npm run audit:alerts`
  - `npm run audit:ui`
- QA matrix status:
  - `ui:flows:preflight` blocked by unreachable local server (`http://localhost:8083`).
  - `test:bookings` pass
  - `test:messaging` pass
  - `test:safety` has 1 unrelated trust/home route assertion failure.
- Typecheck blocker previously noted in `booking-crud-service.ts` is no longer active in current state.

## Completed in this pass

- Sprint 6 WS3 strict audit pass:
  - Audited all remaining `uiFeedback.alert(...)` callsites by button structure/intent.
  - Converted final leftover non-decision popup branch in `hooks/use-event-attendees.ts`:
    - when no non-responders remain, now uses toast instead of modal alert.
    - reminder confirm path (`Cancel` / `Send`) remains an explicit decision alert.
  - Remaining alert inventory after audit:
    - `123` total alerts
    - `115` two-button decision dialogs
    - `6` three-button choice dialogs
    - `1` five-option action dialog
    - `1` intentional blocking session-expiry dialog (`hooks/use-token-expiry-alert.ts`)
  - Verification note for this pass:
    - `npm run typecheck` is currently failing on a pre-existing unrelated booking service error:
      - `services/booking/booking-crud-service.ts` (`SessionRegistration.athleteId` typing)
    - `lint:ui-actions`, `audit:alerts`, and `audit:ui` still pass.
- Sprint 6 WS2 refinement pass (single-action alert cleanup):
  - Converted remaining single-button `uiFeedback.alert(..., [{ text: 'OK' | 'Done' | ... }])` patterns to `uiFeedback.showToast(...)`.
  - Where a single alert button only triggered navigation/action (for example `router.back()` / `router.replace(...)`), preserved behavior by executing the action directly after toast.
  - Intentionally preserved session-expiry blocking alert flow in `hooks/use-token-expiry-alert.ts` (explicit modal options + forced logout path).
  - Scope: `29` files updated, `34` alert callsites migrated in this pass.
- Sprint 6 WS2 bulk conversion pass (toast-first):
  - Converted `uiFeedback.alert(title, message)` callsites (two-arg, non-button flows) to `uiFeedback.showToast(message, tone)` via AST-safe codemod.
  - Confirmation/action-sheet paths (alerts with button arrays) were intentionally left unchanged.
  - Scope: `107` files updated across `app`, `hooks`, and `components`.
  - Conversion volume: `342` alert callsites migrated in this pass.
- Sprint 6 P0 inline feedback slice implemented:
  - `hooks/use-add-child.ts` now uses inline `validationMessage` state instead of required-field popups; success/error save outcomes now use toast.
  - `app/(modal)/add-child.tsx` now renders `StatusBanner` for cross-field blocking validation.
  - `hooks/use-create-session.ts` now exposes `validationMessage` + `clearValidationMessage`; schedule/ownership validation paths now set inline banner state (instead of popup alerts).
  - `app/sessions/create.tsx` now renders `StatusBanner` for session-creation validation failures.
  - `components/location/add-location-picker.native.tsx` and `components/location/add-location-picker.web.tsx` now render inline validation errors for search/save failures (no popup default for those cases). Native also adds explicit "Open Settings" recovery action after permission denial.
  - `hooks/use-edit-profile.ts` now uses inline modal validation messages (experience/language/certification), page-level `formMessage`, and toast for successful save.
  - `app/(tabs)/edit-profile.tsx` now renders top `StatusBanner` and passes modal validation messages into profile modal sections.
  - Profile modal sections updated to render inline `modalError` copy:
    - `components/profile/edit-experience-section.tsx`
    - `components/profile/edit-languages-section.tsx`
    - `components/profile/edit-certifications-section.tsx`
- Implemented central feedback bridge: `services/ui-feedback.ts`.
- Added in-app action sheet provider: `components/ui/action-sheet.tsx`.
- Added in-app prompt/input sheet provider: `components/ui/input-sheet.tsx`.
- Wired providers in root layout: `app/_layout.tsx`.
- Registered presenters from existing UI providers:
  - `components/ui/app-alert.tsx`
  - `components/ui/toast.tsx`
- Extended `StatusBanner` with optional action button:
  - `components/ui/primitives/StatusBanner.tsx`
- Exported new UI APIs from `components/ui/index.ts`.
- Added feedback surface policy doc:
  - `docs/FEEDBACK_SURFACE_POLICY.md`
- Added/updated guardrails:
  - `scripts/lint-ui-actions.js` now checks `app`, `hooks`, `components` and blocks native `Alert.alert/prompt`.
  - New audit script: `scripts/audit-alert-usage.js`
  - New npm script: `audit:alerts` in `package.json`.
- Migrated native `Alert.alert`/`Alert.prompt` usage in product code (`app/hooks/components`) to `uiFeedback.alert/prompt`.
- Removed product `useAppAlert().showAlert` callsites (remaining `showAlert` is internal to `components/ui/app-alert.tsx` only).

## Baseline typecheck fixes included

- `app/book/[coachId]/index.tsx`
- `app/group-sessions/[id].tsx`
- `components/progress-loop/results-program-hero.tsx`
- `components/progress-loop/intervention-playbook-sheet.tsx`
- `components/progress-loop/task-detail-sheet.tsx`

## Verification run results

- `npm run typecheck` -> PASS
- `npm run lint:ui-actions` -> PASS
- `npm run audit:ui` -> PASS
- `npm run audit:alerts` -> PASS
  - Native Alert calls: `0`
  - `uiFeedback.alert` calls: `123`
  - `uiFeedback.prompt` calls: `1`
  - `uiFeedback.showToast` calls: `380`

## Immediate next tasks

1. Convert high-priority validation flows from popup/toast fallback to true inline errors + `StatusBanner` where cross-field:
   - `hooks/use-create-session.ts`
   - `hooks/use-add-child.ts`
   - `hooks/use-edit-profile.ts`
   - `components/location/add-location-picker.native.tsx`
   - `components/location/add-location-picker.web.tsx`
2. Reduce informational `uiFeedback.alert(...)` usage by moving clear non-blocking success/error outcomes to `uiFeedback.showToast(...)`.
3. Keep destructive/irreversible actions on in-app confirm only.
4. Run targeted role flow checks after inline migration:
   - Booking/invites/session-management
   - Verification/account/privacy
   - Group/community actions

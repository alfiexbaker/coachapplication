# Next Step Handoff (2026-03-05)

## Completed in this pass

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
  - `uiFeedback.alert` calls: `534`
  - `uiFeedback.prompt` calls: `1`
  - `uiFeedback.showToast` calls: `0`

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


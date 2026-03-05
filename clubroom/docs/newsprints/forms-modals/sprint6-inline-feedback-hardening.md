# Forms & Modals Sprint 6: Inline Feedback Hardening

**Date**: 2026-03-05  
**Scope**: Booking/Revenue + Trust/Ops + Community + Development  
**Goal**: Remove popup-default behavior after native alert migration by converting informational/error feedback to inline + toast first, while preserving in-app confirm dialogs only for destructive/irreversible actions.

---

## Why this sprint exists

Sprint 5 removed native `Alert.alert`/`Alert.prompt` usage from product flows and established in-app feedback infrastructure.  
Current baseline still overuses blocking dialogs for non-blocking outcomes.

### Baseline (2026-03-05)

From `npm run audit:alerts`:

- Native `Alert.*` calls: `0`
- `uiFeedback.alert(...)`: `534`
- `uiFeedback.prompt(...)`: `1`
- `uiFeedback.showToast(...)`: `0`

This sprint reduces alert-style popups and enforces:

1. Inline validation for form errors
2. Toast for success/recoverable outcomes
3. Confirm dialogs only for destructive decisions

---

## Sprint goals (hard targets)

1. **Popup reduction**
- Reduce `uiFeedback.alert(...)` from `534` to **<= 160**

2. **Toast adoption**
- Increase `uiFeedback.showToast(...)` from `0` to **>= 250**

3. **Inline validation**
- Convert targeted high-impact forms from popup validation to inline field errors/status banners

4. **No regressions**
- Keep destructive confirmations in place for cancellation/deletion/irreversible actions

5. **Guardrail integrity**
- Keep native alert count at `0` (`app|hooks|components`)

---

## In-scope workstreams

## WS1: Inline validation migration (P0)

Target files:

- `hooks/use-create-session.ts`
- `hooks/use-add-child.ts`
- `hooks/use-edit-profile.ts`
- `components/location/add-location-picker.native.tsx`
- `components/location/add-location-picker.web.tsx`

Requirements:

- Replace popup validation with:
  - field-level inline errors for direct input issues
  - `StatusBanner` for cross-field/flow-level blocking messages
- Disable submit/save actions while validation is invalid
- Keep copy concrete and role-aware

## WS2: Toast-first non-blocking feedback (P0)

Across `app|hooks|components`, convert `uiFeedback.alert(...)` to `uiFeedback.showToast(...)` for:

- success confirmations (`Saved`, `Sent`, `Updated`, `Created`, `Deleted`)
- recoverable action errors where user remains in current screen
- short informational notices

Do **not** convert:

- destructive confirmation dialogs
- multi-option decision prompts
- required user decision points

## WS3: Confirmation discipline (P0)

All destructive actions must remain explicitly confirmed via in-app confirm flow:

- cancellation
- deletion
- void/end-series/remove/leave/deactivate actions

All confirm copy must state:

1. exact affected entity
2. irreversible consequence when applicable
3. clear action label

## WS4: Permission guidance UX (P1)

For permission-required flows:

- show inline/status guidance with an explicit next action
- use toast for short “permission denied/required” outcomes after attempts
- avoid informational blocking popup unless the user must choose immediately

---

## Execution order

1. Migrate WS1 files fully (inline-first baseline)
2. Run bulk WS2 conversion pass for non-blocking `uiFeedback.alert(...)`
3. Audit WS3 paths to ensure destructive confirms were not unintentionally downgraded
4. Tighten WS4 permission-heavy surfaces
5. Validate and publish final audit metrics

---

## Acceptance criteria

Functional:

- High-impact form targets render inline validation (not popup) for required/invalid fields
- Destructive actions still require explicit confirm
- Non-blocking successes/errors are predominantly toast-based

Technical:

- `rg "Alert\\.(alert|prompt)" app hooks components` -> `0`
- `npm run typecheck` -> pass
- `npm run lint:ui-actions` -> pass
- `npm run audit:ui` -> pass
- `npm run audit:alerts` -> pass and report target deltas

UX:

- No “lazy popup” behavior for basic success/error/validation cases
- Feedback remains visible, actionable, and consistent with Clubroom UI language

---

## Test scenarios

1. Create session:
- Missing/invalid values show inline errors
- submit disabled until valid
- success uses toast

2. Add child:
- required-field errors inline
- successful creation feedback non-blocking

3. Edit profile:
- pricing/range errors inline
- save success toast

4. Location picker:
- short/invalid address issues shown inline/banner
- permission outcomes use guidance + toast

5. Booking/session destructive flows:
- cancel/end/remove actions still require confirm dialog

---

## Risks and mitigations

Risk: accidental removal of destructive confirms during bulk conversion  
Mitigation: explicit confirm audit pass on cancellation/deletion keywords before merge.

Risk: inconsistent inline validation patterns across screens  
Mitigation: reuse shared error rendering style and `StatusBanner` action patterns.

Risk: over-toast spam  
Mitigation: reserve toast for concise outcomes and avoid duplicates in chained callbacks.

---

## Definition of done

1. Sprint goals hit or deviations documented with owner + follow-up file list
2. Validation and toast-first behavior implemented in scoped targets
3. Guardrail checks all pass
4. Final metric snapshot added to sprint notes


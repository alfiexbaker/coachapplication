# Booking & Sessions Sprint 6: Route Dedupe + Reachability

**Date**: 2026-02-27  
**Status**: Execution-ready  
**Spines**: Booking/Revenue + Development + Trust/Ops

## Objective
Remove repeated interaction steps, guarantee small-screen action reachability, and harden route access behavior per role.

## Touchpoint Compression Rules
1. Use `Routes.sessionsCreateIntent` for all create/invite entry points.
2. Keep tab visibility independent from route permission.
3. Any long-form modal must follow `scroll body + fixed action footer`.
4. Add Playwright route assertions for critical coach/parent/athlete paths.

## 5 Additional Issues (new)
1. **Series booking groups still hide ownership lineage**
   - Impact: recurring session groups are not clearly marked as club-owned vs self-owned.
   - Fix: propagate ownership badges to grouped recurring cards (`SeriesBookingGroup`).

2. **Create flow does not block club mode when POST_AS_ACADEMY is missing**
   - Impact: user can select club mode then fail late.
   - Fix: guard in details step and disable launch in console when permission absent.

3. **Invite-to-existing flow lacks explicit ownership summary**
   - Impact: parent receives invite context without clear actor/club attribution.
   - Fix: include actor + club context in invite note/summary copy.

4. **Recurring generated bookings don’t expose assignee lineage in summary surfaces**
   - Impact: recurring programs become opaque during handovers.
   - Fix: persist and display `ownerCoachId/assigneeCoachId` in recurring summaries.

5. **No Playwright assertion for booking console route stability**
   - Impact: regressions can hide behind route redirects.
   - Fix: add `coach_manage_bookings` and club-assigned create-intent flows with `expectPath`.

## 5 Additional Issues (deep pass 2)
1. **Lazy progress seed import could fail and block parent progress route**
   - Impact: `/development/child-progress/:id` intermittently surfaced a blocking error state.
   - Fix: treat demo-seed bootstrap failures as non-blocking and continue loading real progress data.

2. **Payment instructions modal could hide Save actions on small screens**
   - Impact: coaches could not reliably reach save controls on iPhone SE-sized viewports.
   - Fix: use full-screen modal + safe-area container + reserved scroll bottom for fixed footer.

3. **Add-location modal could hide action row after map search on small screens**
   - Impact: users could complete location search but fail to confirm selection.
   - Fix: use full-screen modal + fixed action row safe-area padding + footer-height content padding.

4. **Review step allowed incomplete draft to proceed to confirmation**
   - Impact: users reached confirmation then hit avoidable blocking validation errors.
   - Fix: gate review CTA on required draft fields (coach/date/time/athlete) and show inline guidance.

5. **Confirmation step depended only on draft coach name**
   - Impact: deep-link or refresh scenarios failed booking creation despite valid coachId.
   - Fix: resolve coach name from coach service when missing in draft before final create call.

## Acceptance
- [ ] iPhone SE critical forms always expose Save/Confirm without dead-end.
- [ ] Role-route checks catch booking access regressions before merge.
- [ ] Club assignment context remains visible from console through review and stored records.

## Execution Update (2026-02-27, pass 3)
- Added booking-lineage propagation for recurring-generated bookings:
  - `actingAs`, `ownerCoachId`, `assigneeCoachId`, `createdBy*`, `clubId` now copied into generated bookings.
- Added lineage backfill in bookings list mapping:
  - if generated booking record lacks lineage, summary mapping reads it from parent recurring record.
- Added lineage visibility in booking surfaces:
  - recurring series group cards and unified booking cards now show a club ownership badge (`Club-owned`, `Assigned by Club`, `Club-assigned`) when applicable.
- Added explicit Playwright modal action assertions for small-screen reachability:
  - schedule availability -> day editor -> add location modal -> `Use Location` visible.
  - earnings -> payment instructions modal -> `Save payment instructions` visible.

## Execution Update (2026-02-27, pass 4)
- Hardened existing invite flow ownership controls:
  - club-mode existing invites now require explicit assignee coach selection and expose assignee chips in-flow.
  - ownership summary section is visible in existing invite flow before submission.
  - invite note payload now appends club ownership context (`created by`, `on behalf of`, `session owner`) for parent clarity.
- Expanded coach booking visibility for club operations:
  - coach sessions list now includes club-owned offerings created by the current user, even when assigned to another coach.
- Added Playwright route assertion for club ownership controls in existing invite flow:
  - `/sessions/create?intent=existing&actingAs=club...` checks `Invite as`, `Assign coach`, and `Ownership summary`.

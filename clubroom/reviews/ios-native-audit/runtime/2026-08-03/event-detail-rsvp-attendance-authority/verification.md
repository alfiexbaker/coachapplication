# Event detail, RSVP, and attendance authority verification

Date: 2026-08-03

## Scope

- `app/events/[id].tsx` (`ROUTE-077`)
- `app/events/[id]/attendees.tsx` (`ROUTE-078`)
- `app/events/[id]/rsvp.tsx` (`ROUTE-079`)

## Finding and fix

The event detail screen loaded staff-only attendance list and statistics in the same required request batch as the event, self RSVP, and self attendance. An active parent or athlete could therefore receive the whole-screen error state even though their event and own records were authorised.

Full event RSVP list reads were also available to every active club member. Those rows can include optional attendee notes, so the API now allows the list only to active event staff or privileged administrators. A single RSVP is available to its active-member owner, staff, or an administrator.

The app now loads the event and the actor's own RSVP/check-in first. It requests the staff workspace separately, preserving real service errors while treating only the explicit staff-authorisation denial as unavailable staff capability. All three protected screen caches include the authenticated actor id.

The detail route no longer renders full response rows or staff-only undo/reminder actions to ordinary members. The direct attendee route gives nonstaff a clear access state. The RSVP route submits the real athlete role and removes the duplicate reminder card. The attendee route removes fake export and fake reminder controls.

## Automated evidence

- Root `npm run typecheck`: pass.
- Root `npm run test:compile`: pass.
- Focused client tests: 11/11 pass, including `event-detail-authority-boundary`, event workspace, attendance API-mode, and RSVP API-mode suites.
- Focused Fastify seed test: pass. It proved parent list RSVP `403`, parent self RSVP `200`, parent attendance list `403`, parent self attendance `200`, parent reminder `403`, staff list `200`, and staff reminder `200`. The test checked deny audit rows for RSVP read, attendance read, and reminder.
- Targeted ESLint: no errors. Existing warnings remain in the large booking route and its pre-existing test file.
- React Doctor: the new hook diagnostics were removed. Remaining output is the protected user work-in-progress `hooks/use-group-session.ts` compiler diagnostic, pre-existing backend loop suggestions, and large screen component suggestions. No broad refactor was made in this security slice.

## Native and external limits

An `iPhone 16` simulator booted and a local native-audit build was attempted with the documented development-only mock/audit flags. The simulator XPC/simctl path hung before it produced an app session or accessibility tree. No screenshot or native interaction is claimed. This is recorded as `ENV-009`.

No production or staging requests, Supabase writes, or Sentry writes occurred. Supabase direct RLS evidence remains unavailable (`ENV-003`) and Sentry readback remains unavailable (`ENV-004`).

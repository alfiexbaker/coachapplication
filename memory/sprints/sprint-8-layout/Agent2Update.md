# Sprint 8 — Layout Primitives Migration
## Agent 2: App Screens E-Z — Replace raw flexDirection with Row/Column

**Status**: NOT_STARTED
**Blocked by**: Sprint 5 (useScreen() retrofit)

---

## Objective
Replace all raw `flexDirection` usage in screen files E through Z with Row/Column primitives.

## EXCLUSIVE FILE OWNERSHIP
**You ONLY touch screen files in:**
```
clubroom/app/development/athlete-session/[sessionId].tsx
clubroom/app/development/athlete/[athleteId]/special-needs.tsx
clubroom/app/development/badges.tsx
clubroom/app/development/child-progress/[childId].tsx
clubroom/app/development/my-progress.tsx
clubroom/app/development/session/[sessionId].tsx
clubroom/app/discover-sessions.tsx
clubroom/app/discover/map.tsx
clubroom/app/drills/[id].tsx
clubroom/app/drills/challenges.tsx
clubroom/app/drills/create-challenge.tsx
clubroom/app/drills/create.tsx
clubroom/app/earnings.tsx
clubroom/app/events/[id].tsx
clubroom/app/events/[id]/attendees.tsx
clubroom/app/events/[id]/rsvp.tsx
clubroom/app/events/create.tsx
clubroom/app/events/index.tsx
clubroom/app/family/calendar.tsx
clubroom/app/family/index.tsx
clubroom/app/family/sharing.tsx
clubroom/app/family/spending.tsx
clubroom/app/favourites/index.tsx
clubroom/app/goals/create.tsx
clubroom/app/goals/index.tsx
clubroom/app/group-sessions/[id].tsx
clubroom/app/group-sessions/[id]/roster.tsx
clubroom/app/group-sessions/create.tsx
clubroom/app/health/[id].tsx
clubroom/app/health/index.tsx
clubroom/app/health/injuries.tsx
clubroom/app/health/log.tsx
clubroom/app/invites.tsx
clubroom/app/invoices/[id].tsx
clubroom/app/invoices/index.tsx
clubroom/app/matches/create.tsx
clubroom/app/matches/index.tsx
clubroom/app/packages/[id].tsx
clubroom/app/packages/index.tsx
clubroom/app/packages/manage.tsx
clubroom/app/rate-coach.tsx
clubroom/app/referrals/index.tsx
clubroom/app/referrals/invite.tsx
clubroom/app/review/[bookingId].tsx
clubroom/app/roster/[athleteId]/add-to-session.tsx
clubroom/app/roster/[athleteId]/emergency.tsx
clubroom/app/roster/[athleteId]/raise-concern.tsx
clubroom/app/roster/consents.tsx
clubroom/app/roster/index.tsx
clubroom/app/session-notes/[bookingId].tsx
clubroom/app/settings/appearance.tsx
clubroom/app/settings/calendar-sync.tsx
clubroom/app/settings/coaching.tsx
clubroom/app/settings/help.tsx
clubroom/app/settings/notifications/index.tsx
clubroom/app/settings/privacy-policy.tsx
clubroom/app/settings/privacy.tsx
clubroom/app/settings/terms.tsx
clubroom/app/skills/index.tsx
clubroom/app/squads/[id]/invite.tsx
clubroom/app/verification/credentials.tsx
clubroom/app/verification/id.tsx
clubroom/app/videos/[id].tsx
clubroom/app/videos/annotate/[id].tsx
clubroom/app/videos/index.tsx
clubroom/app/videos/review/[id].tsx
clubroom/app/waitlist/index.tsx
clubroom/app/waitlist/manage.tsx
clubroom/app/wallet/promo.tsx
```

**DO NOT TOUCH**: Screens A-D + modals (Agent 1), components A-I (Agent 3), components J-Z (Agent 4).

## Same migration pattern as Agent 1.
## Same spacing token mapping as Agent 1.
## Same rules as Agent 1.

## Tasks
- [ ] List all 70 screen files with raw flexDirection
- [ ] Replace flexDirection: 'row' → Row in each
- [ ] Replace flexDirection: 'column' → Column where explicit
- [ ] Map spacing values to tokens
- [ ] Remove redundant style props

## Safety Checks
- [ ] `grep -rn "flexDirection" <each owned file>` returns 0
- [ ] All Row/Column imports resolve
- [ ] No visual layout breakage
- [ ] TypeScript compiles: `cd clubroom && npx tsc --noEmit`

## Files Modified
_None yet_

## Blockers
_Sprint 5 should complete first_

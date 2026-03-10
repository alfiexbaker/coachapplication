# Sprint 20 - Pre-API Stability, Performance, And Flow Bar

## Objective

Set the minimum reliability and performance bar for the pre-API POC.

## Why This Sprint Exists

Even a well-planned POC will not feel complete if the main flows are slow, fragile, or dependent on manual explanation when something glitches.

## Scope

1. Identify the hottest pre-API flow surfaces:
   - sessions create
   - manage/assignment
   - coach profile/discovery
   - booking review/detail
   - progress loop follow-up
2. Define the minimum pre-API reliability bar for those flows.
3. Tackle the most obvious monolith and performance pain where it threatens demoability.
4. Run the highest-value role flows and document remaining weak spots.
5. Produce an explicit pre-API known-limits and pass-bar note.

## Acceptance Criteria

- the main demo flows are stable enough to repeat
- the worst pre-API lag or fragility points are understood and reduced
- the team can state which flows are "green enough" and which are still risky
- known limits are documented instead of hidden

## Verification

- `npm run typecheck`
- targeted role flow smokes
- targeted architecture/performance review of hot files

## Key Files

- `app/sessions/create.tsx`
- `hooks/use-create-session.ts`
- `app/development/progress-loop.tsx`
- `services/social-feed-service.ts`
- booking and coach profile hot paths

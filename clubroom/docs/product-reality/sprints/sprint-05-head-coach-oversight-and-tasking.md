# Sprint 05 - Head Coach Oversight And Tasking

## Objective

Give `HEAD_COACH` and director-style roles a real product surface for oversight, standards, and coaching quality.

## Why This Sprint Exists

The hierarchy is not real until the middle of the pyramid has a distinct job in product.

## Scope

1. Define the head coach operating surface.
2. Scope visibility by assigned club, program, squad, or coach group.
3. Add coach oversight views for:
   - sessions awaiting completion
   - overdue follow-up
   - athlete or squad watchlist items
4. Add standards/tasking primitives that are realistic for V1:
   - required follow-up
   - session-note completion expectations
   - program standards or checklist items
5. Keep this role separate from owner finance control and from generic coach home.

## Acceptance Criteria

- `HEAD_COACH` has a distinct runtime surface
- oversight is scoped, not org-global by default
- head coach can see delivery quality and completion health for assigned scope
- standards and tasking are explicit product behavior, not only language in docs

## Verification

- targeted role-based UI smoke for head coach flows
- targeted tests around scoped visibility
- `npm run typecheck`

## Output

At the end of this sprint, the app can answer:

- "What does a head coach actually do here beyond being a coach with a better title?"

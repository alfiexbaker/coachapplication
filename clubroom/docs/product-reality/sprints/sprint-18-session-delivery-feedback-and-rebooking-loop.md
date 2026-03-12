# Sprint 18

## Name

Session Delivery, Feedback, And Rebooking Loop

## Why

The repo already had a real session completion flow, but the live booking surface still did not make the post-session loop feel complete. Coaches could not finish a past booking directly from booking detail, and parents did not get a clear outcome summary that connected session feedback to the child progress surface and the next booking decision.

## Scope In This Slice

1. Expose coach completion entry from booking detail when a session is ready to be completed.
2. Show a parent-facing session outcome summary on completed bookings.
3. Prefer structured session feedback and fall back to session notes when rendering the outcome.
4. Link completed booking outcomes into child progress so the feedback loop feels continuous.
5. Add user-story tests for completion eligibility and session outcome rendering.

## Acceptance

- A coach can complete a past confirmed or awaiting-completion booking from booking detail.
- A coach cannot complete a future booking from booking detail.
- Parents opening a completed booking can see the session outcome summary, homework, and improvement focus.
- Parents can jump from the completed booking into the child progress feedback view.
- The new delivery-loop behavior has targeted tests and verification.

## Out Of Scope

- Reworking the full completion wizard.
- Editing public reviews after submission.
- Automated rebooking recommendations across the whole app.

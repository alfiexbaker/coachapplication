# Sprint 08 - Relationship Model And Blocking Integrity

## Objective

Finish the professional relationship model and enforce block integrity across it.

## Why This Sprint Exists

This still matters, but it is no longer ahead of the org operating model. Once the org surfaces are real, the relationship model can be cleaned up without fighting the main commercial architecture.

## Scope

1. Remove `friend` language from coach and marketplace surfaces.
2. Apply the chosen model:
   - `Follow Coach`
   - `Save Coach`
   - `Request Contact`
3. Define what unlocks messaging.
4. Make blocking cut across:
   - follow state
   - save state
   - request-contact state
   - messaging
   - feed eligibility
5. Remove contradictory social graph state when a block is applied.

## Acceptance Criteria

- coach surfaces no longer use the wrong relationship language
- blocking cuts across all connected relationship state
- the team can explain what connection means in Clubroom in one short paragraph

## Verification

- targeted follow/block tests
- direct source audit for friend wording
- targeted UI smoke for coach profile, feed, chat, and booking entry

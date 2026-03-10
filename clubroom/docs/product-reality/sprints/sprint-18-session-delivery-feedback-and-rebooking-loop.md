# Sprint 18 - Session Delivery, Feedback, And Rebooking Loop

## Objective

Make the coach and user experience believable after the session is delivered.

## Why This Sprint Exists

The product needs a coherent loop:

- booking
- delivery
- completion
- feedback
- progress update
- next action or rebooking

Without that loop, the product still feels fragmented.

## Scope

1. Audit session delivery and completion flows for coaches.
2. Tighten how notes, feedback, badges, and progress updates surface after sessions.
3. Make parent and athlete follow-up feel connected to the actual booked session.
4. Add or tighten next-step prompts:
   - message
   - review
   - rebook
   - continue program
5. Keep the loop consistent for org-owned and coach-owned work.

## Acceptance Criteria

- coach completion leads cleanly into follow-up
- parent and athlete can see the value created by the session
- rebooking or next-step prompts feel natural
- the app can demonstrate a full coaching cycle, not only a booking cycle

## Verification

- targeted session feedback and progress tests
- targeted smoke for session completion and rebooking flow
- `npm run typecheck`

## Key Files

- `app/(tabs)/bookings/session-feedback.tsx`
- `hooks/use-session-detail-modal.ts`
- progress and session follow-up surfaces
- booking detail and rebook entry points

# Sprint 06 - Account Lifecycle And User Trust

## Objective

Make account and lifecycle flows honest, persistent, and operationally defensible.

## Why This Sprint Exists

These flows carry high user trust:

- change password
- deactivate account
- delete account
- request data export

If they look real but are not fully real, the trust cost is high.

## Current Evidence

- email and phone updates now persist
- password change is toast-only
- deactivate account logs the user out
- delete account creates a local request record but does not complete a real lifecycle transition

## Scope

1. Rewrite lifecycle copy to match actual behavior.
2. Decide what must become real immediately vs request-based.
3. Remove fake completion language where the backend/ops path does not exist yet.
4. Provide explicit user-state messaging for pending deletion and reversible deactivation.

## Acceptance Criteria

- every lifecycle action says exactly what it really does
- no screen implies irreversible completion when only a request was recorded
- account state transitions are internally consistent
- support/escalation paths are explicit where automation is not yet real

## Verification

- targeted settings/account tests
- UI smoke for `/settings/account`
- direct copy review against actual service behavior

## Discussion Needed

- what "deactivate" should mean in Clubroom
- whether deletion should remain request-based until backend and admin ops are ready

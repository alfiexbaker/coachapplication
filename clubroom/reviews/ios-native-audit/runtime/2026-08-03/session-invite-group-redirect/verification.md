# ROUTE-117 — group-invite redirect

## Scope

`/session-invites/group` is a legacy entry point from group-session management.

## Runtime path

`GroupInviteRedirect` immediately replaces itself with
`Routes.sessionsCreateIntent({ intent: 'existing', source: 'group_manage' })`.
The canonical session-creation route owns the existing-session invite UI and
its backend-authorised action flow.

## Verification

- The route has one intent and no duplicate form or action.
- It uses `router.replace`, so the transient redirect is not left in the back
  stack.
- The regression contract verifies the canonical helper, `existing` intent,
  and `group_manage` source.
- Root type-check and test compilation: passed.
- Group-invite redirect contract: passed.

## Limitation

Native interaction remains blocked by `ENV-009` (CoreSimulator XPC hangs while
installing the built development client). No production or staging invite,
database audit, Sentry event, or third-party state was changed.

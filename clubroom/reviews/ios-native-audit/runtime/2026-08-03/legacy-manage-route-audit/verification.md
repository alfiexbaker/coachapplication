# ROUTE-099 — legacy manage redirect

## Scope

`/manage/[legacy]` is a compatibility route for legacy manage links.

## Runtime path

`LegacyManageRoute` uses Expo Router `Redirect` to replace the transient route
with `Routes.MANAGE_BOOKINGS`. The canonical bookings console owns the later
coach authorisation and API work.

## Verification

- The redirect has no independent fetch, mutation, or duplicate UI.
- The regression contract verifies that it uses `Redirect` and the canonical
  typed bookings route.
- Root type-check and test compilation: passed.
- Legacy-manage redirect contract: passed.

## Limitation

Native interaction remains blocked by `ENV-009` (CoreSimulator XPC hangs while
installing the built development client). No production or staging bookings,
database audit, Sentry event, or third-party state was changed.

# QA-100 — roster athlete detail uses one authorised emergency snapshot

## Scope

Coach roster athlete profile only. The screen already obtains `AthleteEmergencyQuickView` through the verified-coach safety path before rendering. It then loaded `ChildProfile`, whose default hydration repeated the medical, emergency-contact, and consent reads.

## Change

`childService.getChild` now accepts `includeTrustData`. The athlete-detail hook passes `false`, retaining the non-sensitive athlete/SEN fields it renders while redacting medical, emergency-contact, and consent fields. The original verified emergency read stays fail-closed and remains the only sensitive snapshot used by the screen.

## Verification

- Root typecheck and targeted ESLint passed.
- Compiled app checks passed: 21/21, including the emergency fail-closed contract, the new child-profile redaction case, and roster add-to-session authority checks.
- Seed-only Fastify suites passed: 42/42 coach-club route checks and the verified/denied emergency-read authority check. The production bearer path sets `allowDebugTrustHeaders: false`; roster relationships and coach verification come from the server trust-access repository.
- React Doctor reported one existing compiler diagnostic in protected user work at `hooks/use-group-session.ts:140`; this slice did not add a diagnostic.

## Limitations

Native retest remains blocked by ENV-009: the local CoreSimulator XPC install path hangs after a successful build. No simulator was reset, no platform permission was accepted, and no staging or production data, audit record, payment, or third-party service was changed.

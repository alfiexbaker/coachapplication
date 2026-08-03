# QA-085 — roster session authority

## Scope

Checked the local unverified-coach route from roster entry through the session builder. No session was submitted and no staging or production request was made.

## Native evidence

- `add-to-session.png`: the rostered player opens the compact choice between a new and an existing session.
- `session-builder.png`: the new-session builder opens with the preselected roster context. The first capture was taken during the native transition and is deliberately not evidence; the settled second capture is retained here.

## Authority decision

This is intentional, not a verification bypass. Session creation is normal scheduling authority:

- standalone sessions require the authenticated coach to create for themself;
- club sessions require active club membership and the `create_org_sessions` capability;
- verification is not a prerequisite for either path.

The isolated Fastify group-session test passed with an authenticated coach header that deliberately has no `x-coach-verified` flag. Its create, publish, and cancel lifecycle ran only against the reset-on-exit seed fixture.

Verification remains required for the separate medical, emergency, and shared-injury read paths covered by QA-083 and QA-084. Blocking an unverified coach from raising a session or safeguarding concern would be an invented policy and would make the app less useful without improving the protected-data boundary.

## Result

Pass. The iOS route has a clear purpose and only shows actions the authenticated roster coach is permitted to begin. No product change was needed.

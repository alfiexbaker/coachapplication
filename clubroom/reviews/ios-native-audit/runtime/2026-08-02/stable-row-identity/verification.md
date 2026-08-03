# Stable row identity verification

Date: 2026-08-02

Scope: coach profile background/proof, progress badges and quotes, emergency medical chips, coach schedule sessions, squad invite failures, and app-alert actions.

## Defect

Nine dynamic lists mixed a domain value with the array index for their React key. Reordering or filtering could transfer component identity to a different session, credential, medical item, invite error, quote, badge, or alert action.

## Fix

- Coach experiences and certifications use complete stable content identities; public `Coach` projections do not expose database IDs.
- Badges and quotes use their displayed content identity.
- Medical items use type plus label.
- Schedule rows use the canonical session ID.
- Invite errors use member, error code, and error message.
- Alert actions use normalized style plus outcome label.
- A source-boundary test protects every mapping.

## Reviewed index-key exceptions

- Editable cancellation-policy rows intentionally represent sorted policy positions and are fully controlled; the wire type exposes no row ID.
- Sparkline bars represent sequence positions and hold no component state.
- Skeleton line and row placeholders represent fixed visual positions and hold no component state.

Inventing unstable pseudo-identifiers for those four cases would not improve correctness.

## Verification

- Focused identity and emergency-authority tests: 2/2 passed.
- Focused strict TypeScript project: passed.
- Root TypeScript check: passed.
- Focused ESLint error check and formatting: passed.
- React Doctor diff scan: zero diagnostics.
- Diff check: passed.

No production or staging request, database row, Sentry event, permission rule, navigation target, copy, layout, or accessibility behavior changed.

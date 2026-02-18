# UI Action Tenets (Wave 1)

These are the baseline rules for action design across Clubroom.

## Core Rules

1. One action, one intent.
- Every visible button must do exactly one clear thing.
- If a button does not navigate or execute a concrete action, remove it.

2. No duplicated actions in the same context.
- Do not show multiple buttons that lead to the same destination in the same surface.
- Keep one canonical entry point per task per screen section.

3. Primary action hierarchy.
- A screen should have onthe clear primary CTA.
- Secondary actions should be visually lighter and context-specific.

4. Label by outcome.
- Button labels must describe what happens next (`Create Session`, `Invite to Existing Session`, `Manage Squad`).
- Avoid generic labels that do not communicate outcome.

5. Role and state gating.
- Show actions only when the user can actually complete them.
- Hide or disable impossible actions based on club role, membership, or step completion state.

6. Accessibility is required.
- Every icon-only action must have an `accessibilityLabel`.
- Touch targets should remain at least 44px.

## Engineering Guardrails

1. Require action handlers.
- Interactive action components should require handler props (avoid optional no-op callbacks).

2. Remove dead controls.
- If an action cannot be wired yet, do not render the button.

3. Route consistency.
- Route helpers in `navigation/routes.ts` are the source of truth for navigation actions.

4. PR checklist for action changes.
- Purpose is explicit.
- No duplicates introduced in the same context.
- Role/state guards are correct.
- Accessibility labels added for icon-only actions.
- Lint + typecheck pass.

# Session-assignee async-race verification

Date: 2026-08-02 BST
Scope: existing-session invite owner selection in session creation

## Defect

The assignee effect checked its lifecycle after loading club staff, then awaited a second user-name lookup without checking again. If the club, coach, or initial assignee changed during that second request, the obsolete result could update the visible owner selector.

## Fix

- A second `active` guard now runs immediately after the user-name lookup and before any option, owner, or error state is built.
- The existing ownership boundary test now requires that guard to remain between the await and the first state-derived map.
- One unused duplicate type import in the same screen was removed.

## Verification

- Root TypeScript typecheck passed.
- Existing-session ownership and persisted-actor boundary tests passed: 3/3.
- React Doctor 0.9.3 analyzed the screen and returned zero diagnostics for the changed slice.
- Focused ESLint passed with zero errors and zero warnings.
- The production screen passed Prettier; the existing boundary-test file retains unrelated pre-existing formatter drift, while the added assertion block is formatter-shaped.
- `git diff --check` passed.

No production or staging club, staff, session, invite, or database data was read or changed.

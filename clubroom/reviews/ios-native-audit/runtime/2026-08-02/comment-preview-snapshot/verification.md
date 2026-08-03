# Comment-preview snapshot verification

Date: 2026-08-02 BST
Scope: social feed latest-comment preview

## Defect

The component stored one unkeyed latest comment. When a feed card was reused for a different post or its count changed, the previous preview could remain visible until the new request completed. A successful empty result also left the previous comment in place.

## Fix

- Resolved previews now carry the post ID and comment-count snapshot that produced them.
- A preview renders only when both values still match current props.
- Successful null results are stored, so a deleted/empty latest comment clears correctly.
- An abort-signal guard prevents obsolete requests from updating state.
- A boundary test locks the request key, guard, cleanup, and render key.

## Verification

- Root TypeScript typecheck passed.
- New boundary plus both latest-comment service groups passed: 6 selected tests; 55 unrelated tests were intentionally skipped by name filter.
- React Doctor 0.9.3 analyzed the component and returned zero diagnostics for the changed slice.
- Focused ESLint, Prettier, and `git diff --check` passed.

No production or staging post, comment, user, API, or database data was read or changed.

# Attendee-list input-integrity verification

Date: 2026-08-02 BST
Scope: shared event attendee list

## Defect

The `ALL` filter assigned the `rsvps` prop array directly to `filtered`, then sorted it in place. Rendering the list could therefore reorder the parent-owned roster and affect other consumers of the same array.

## Fix

The component now copies the filtered array before sorting it. Status priority and newest-response ordering are unchanged. Two visibly misindented accessibility props in the same list declarations were aligned without changing their values.

## Verification

- Root TypeScript typecheck passed.
- React Doctor 0.9.3 analyzed `AttendeeList.tsx` and returned zero diagnostics for the changed slice.
- Focused ESLint passed with zero errors and zero warnings.
- Focused Prettier check passed.
- `git diff --check` passed.

No network request, database action, production mutation, or visual behavior change was involved.

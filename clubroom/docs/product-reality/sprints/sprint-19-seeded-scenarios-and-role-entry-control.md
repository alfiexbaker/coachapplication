# Sprint 19

## Name

Seeded Scenarios And Role Entry Control

## Why

The repo already had seeded users and demo data, but the entry point was still operator-hostile. A demo user had to remember raw credentials or dig through dev-only lists, which meant the seeded stories were present in storage but not actually usable as reliable walkthroughs.

## Scope In This Slice

1. Derive stable named demo stories from the seeded user set instead of exposing only raw credentials.
2. Add one-tap role entry cards on the login screen for the key seeded stories.
3. Keep the role-entry mapping resilient when preferred usernames are absent by falling back to semantic role matching.
4. Preserve the lower-level dev credential list for debugging without making it the main operator path.
5. Add targeted tests for the seeded role-entry selection logic.

## Acceptance

- The login screen exposes named seeded role-entry cards for coach, parent, athlete, and admin stories when demo users are available.
- A demo operator can start a seeded walkthrough without manually typing credentials.
- The seeded role-entry registry still resolves the intended stories when exact preferred usernames are missing.
- The role-entry logic has targeted tests and verification.

## Out Of Scope

- Reworking production auth.
- Building a full scenario-launcher surface beyond login.
- Changing the seeded data model itself.

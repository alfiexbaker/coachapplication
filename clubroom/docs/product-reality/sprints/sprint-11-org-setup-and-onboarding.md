# Sprint 11 - Org Setup And Onboarding

## Objective

Make the first-run org setup story believable for an owner creating and configuring a coaching business.

## Why This Sprint Exists

The app cannot be a complete POC if the org only exists as pre-seeded state. The owner needs a coherent setup path.

## Scope

1. Audit and tighten org creation and first-run setup.
2. Make branding, base details, and commercial mode part of the setup story.
3. Add the first staff invite and staffing bootstrap path.
4. Add clear next steps after org creation:
   - invite staff
   - create first session or program
   - review bookings path
5. Remove fake or confusing setup dead ends.

## Acceptance Criteria

- a new org can be created and configured coherently
- the owner understands what to do next after setup
- setup connects directly into staffing and session creation
- demo users do not need hidden knowledge to get the org started

## Verification

- targeted create-org tests
- targeted smoke for org creation, settings, and first invite path
- `npm run typecheck`

## Key Files

- `app/club/create.tsx`
- `app/club/setup-complete.tsx`
- `app/club/my-clubs.tsx`
- `app/club/settings.tsx`
- `hooks/use-create-club.ts`
- `hooks/use-club-settings.ts`
- `services/social-feed-service.ts`

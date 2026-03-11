# Sprint 16 - Coach Discovery, Profile, And Conversion

## Objective

Make the coach-facing discovery and conversion path believable as a professional coaching product.

## Why This Sprint Exists

The coach profile and discovery loop should read like a business surface first, not a social graph with booking bolted on afterward.

## Scope

1. Audit the live coach discovery cards, coach profile, favourites, and booking-entry CTAs.
2. Remove remaining consumer-social relationship language from coach conversion surfaces.
3. Make the path explicit:
   - view profile
   - follow or save
   - request contact if needed
   - book
4. Keep blocked-state and contact-state behavior honest so the profile never promises actions that booking or messaging will reject.

## Acceptance Criteria

- coach profile reads like a professional conversion surface
- discovery and favourites can route into a profile-first conversion path instead of jumping straight into booking by default
- coach CTA language matches the locked relationship model
- blocked and contact states do not contradict the booking story

## Verification

- `npm run typecheck`
- `npm run test:compile`
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/utils/coach-conversion.test.js`
- direct source audit for legacy friend wording across touched coach surfaces
- `npm run ui:flows:coach-core -- --fail-on=none` when local base URL is reachable

## Key Files

- `hooks/use-coach-detail.ts`
- `app/coach/[id].tsx`
- `hooks/use-public-profile.ts`
- `components/coach/coach-detail-hero.tsx`
- `components/coach/public-profile-hero.tsx`
- `components/parent/discover-coach-list.tsx`
- `components/favourites/FavouriteCoachCard.tsx`
- `app/book-coach.tsx`

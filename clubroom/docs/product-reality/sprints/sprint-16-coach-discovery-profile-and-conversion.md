# Sprint 16 - Coach Discovery, Profile, And Conversion

## Objective

Make the coach-facing discovery and conversion path believable as a professional coaching product.

## Why This Sprint Exists

The current coach profile still leaks consumer-social language and does not yet fully express the professional trust and booking model.

## Scope

1. Audit coach discovery cards, coach profile, and booking-entry CTAs.
2. Replace remaining weak or socially ambiguous coach conversion language.
3. Make the primary coach conversion path explicit:
   - view profile
   - follow or save
   - request contact if needed
   - book
4. Ensure blocked-state and contact-state behavior do not break trust.
5. Make the coach profile feel like a business profile first, not a social profile first.

## Acceptance Criteria

- coach profile reads like a professional conversion surface
- the path from discovery to booking is clear
- coach CTA language matches the chosen relationship model
- contact and block states do not contradict the booking story

## Verification

- targeted coach profile and discovery smoke
- direct source audit for legacy coach-facing friend wording
- `npm run ui:flows:coach-core -- --fail-on=none`

## Key Files

- `hooks/use-coach-detail.ts`
- `app/coach/[id].tsx`
- coach discovery surfaces
- booking entry surfaces

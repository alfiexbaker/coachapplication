# Sprint 15

## Name

POC Demo Readiness And Golden Paths

## Why

By this point the repo had the main runtime loops, but a live walkthrough still depended on operator memory. After sign-in there was no explicit “follow this path next” layer on the real product surfaces, which meant seeded stories existed without a clean demo guide attached to them.

## Scope In This Slice

1. Add a shared walkthrough card component that can live on real role landing surfaces.
2. Define pure golden-path mappings for coach, family, athlete, admin, and owner stories.
3. Mount the walkthrough guidance on the main coach, athlete/family, admin, and owner surfaces.
4. Keep the guidance attached to the real routes instead of building a separate fake demo-only flow.
5. Add targeted tests for walkthrough selection and owner route sequencing.

## Acceptance

- A signed-in seeded user lands on a surface that tells them which real path to click next.
- Coach, family, athlete, admin, and owner stories each have an explicit walkthrough sequence.
- The walkthrough actions route into the existing product flows rather than placeholder screens.
- Walkthrough selection and owner sequencing are covered by targeted tests and verification.

## Out Of Scope

- Rewriting the seeded data model.
- Full UI smoke automation for every golden path.
- Pre-API performance work and broader stability hardening.

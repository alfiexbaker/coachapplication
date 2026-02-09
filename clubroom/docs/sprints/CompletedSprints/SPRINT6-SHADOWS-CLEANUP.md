# Sprint 6: Shadows.light.* → Dynamic Shadows

> **Owner:** AI Pipeline
> **Status:** COMPLETE
> **Scope:** Replace all `Shadows.light.*` with `Shadows[scheme].*` in code files
> **Files:** 7 code files (excluding docs)

---

## Items

### App Screens
- [x] **S6-1** `app/settings/coaching.tsx` — 2 instances of `Shadows.light.card`

### Components
- [x] **S6-2** `components/coach/cancellation-policy-editor.tsx` — 2 instances
- [x] **S6-3** `components/coach/smart-slots.tsx` — 4 instances
- [x] **S6-4** `components/coach/blocked-dates-editor.tsx` — 4 instances
- [x] **S6-5** `components/booking/cancel-flow.tsx` — 1 instance
- [x] **S6-6** `components/coach/travel-radius-picker.tsx` — 1 instance

### Other
- [x] **S6-7** `constants/styles.ts` — 3 instances (shared styles, converted to comments + dynamic at usage sites)

---

## Verification
- [x] Grep `Shadows.light.` in all code files — ZERO (docs excluded)
- [x] TypeScript compiles clean
- [x] All tests pass (1760/1760)

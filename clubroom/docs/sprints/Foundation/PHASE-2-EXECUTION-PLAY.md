# Phase 2 Execution Play

> **Date:** 2026-02-10  
> **Decision:** Proceed with Phase 2 now.
> **Standard:** Production-grade migration quality suitable for a premium product.

---

## Kickoff Review (Current Repo State)

Baseline scan before starting:
- `from ... mock-data` imports: **70 files**
- Split: **36 hooks**, **21 components**, **7 app screens**, **5 services**, **1 constants file**
- `TODO(T3.4)` denormalized-field markers: **192** across **9** type files
- `services/user-service.ts`: **does not exist yet**

Interpretation:
- The sprint intent is correct.
- The migration blast radius is large enough that we must run in controlled waves, not one broad pass.
- We should treat denormalized-field removal as a second track after data-access stabilization.

---

## Non-Negotiable Rules

1. No net-new features during Phase 2.
2. Data flow must be `Screen -> Hook -> Service -> apiClient`.
3. Components do not fetch from services directly; they receive data via props.
4. Keep changes slice-based with explicit verification after each slice.
5. No removal of denormalized fields without updating every read site in the same slice.

---

## Spine-Aligned Workstreams

Use product spines to avoid fragmented migration:

1. **Booking, Availability & Revenue**
   - `use-bookings`, `use-booking-detail`, `use-confirm-booking`, booking summaries, session detail dependencies
2. **Development & Analytics**
   - athlete/coach progress hooks, badges, journal/challenges screens, development cards
3. **Community & Growth**
   - club hub, club posts, feed detail, member management, discover and coach profile usage
4. **Trust, Safety & Operations**
   - auth user lookup path, messaging/thread summary reads, admin user views

---

## Wave Plan

### Wave 0 - Baseline and Guardrails (half day)
- Lock the 70-file migration list and track progress per file.
- Record command baselines for mock-data imports and `TODO(T3.4)` markers.
- Confirm TypeScript clean baseline.

Exit gate:
- Baseline metrics captured in sprint notes.
- `npx tsc -p tsconfig.test.json` passes before migration starts.

### Wave 1 - UserService and Identity Access (1 day)
- Create `services/user-service.ts` with:
  - `getUserById`
  - `getUsersByIds`
  - `searchUsers`
  - `getCurrentUser`
- Wire through `apiClient` and `Result<T, ServiceError>`.
- Add typed user-related events if missing.

Exit gate:
- High-traffic `getUserById` callers can migrate without direct mock-data imports.

### Wave 2 - Hook Migration First (3 days)
- Migrate the 36 hook files off mock-data.
- Convert sync mock reads to async service calls with stable loading/error handling.
- Keep hook interfaces stable where possible so screens/components do not churn.

Exit gate:
- `rg -n "from\\s+['\\\"][^'\\\"]*mock-data['\\\"]" hooks` returns 0.
- TypeScript passes.

### Wave 3 - Component Prop Hoist (2 days)
- Remove mock-data imports from 21 component files.
- Push required data via props from parent hooks/screens.
- Avoid service imports in component layer.

Exit gate:
- `rg -n "from\\s+['\\\"][^'\\\"]*mock-data['\\\"]" components` returns 0.
- TypeScript passes.

### Wave 4 - App/Service/Constants Cleanup (1 day)
- Migrate 7 app files, 5 service files, and `constants/booking-types.ts`.
- Remove remaining direct mock-data function dependencies in runtime paths.

Exit gate:
- `rg -n "from\\s+['\\\"][^'\\\"]*mock-data['\\\"]" app services constants` returns 0.
- TypeScript passes.

### Wave 5 - Denormalized Field Removal (2-3 days)
- Remove `TODO(T3.4)` fields from 9 type files in controlled batches.
- For each removed field, update all read sites in the same slice.
- Resolve display names/avatars through UserService lookup paths.

Exit gate:
- `rg -n "TODO\\(T3\\.4\\)" constants types` returns 0.
- TypeScript passes.

### Wave 6 - mock-data Function Retirement (half day)
- Remove exported helper functions from `constants/mock-data.ts`.
- Retain raw seed data only.
- Move reusable seed fixtures where needed for tests.

Exit gate:
- No runtime imports rely on mock-data helper functions.
- Foundation Phase 2 quality gate checklist fully green.

---

## Quality Gates (Hard)

Run at the end of each wave:

1. `rg -n "from\\s+['\\\"][^'\\\"]*mock-data['\\\"]" hooks components app services constants`
2. `rg -n "TODO\\(T3\\.4\\)" constants types`
3. `npx tsc -p tsconfig.test.json`

Final gate:
- Data access path is service-mediated everywhere in runtime code.
- No denormalized TODO markers remain.
- No mock-data helper function dependency remains in runtime paths.

---

## Risk Controls

1. Keep PR slices small enough for complete review and rollback.
2. Migrate by spine and by layer (hooks before components) to reduce cross-layer breakage.
3. Treat auth, bookings, messaging, and development progress as critical smoke paths after each wave.
4. If TypeScript fails after a slice, stop and resolve before taking the next batch.

---

## Done Definition

Phase 2 is done only when:
- Every active data read path routes through services.
- `mock-data` is no longer an app runtime dependency outside approved seed/test contexts.
- Denormalized person-name/photo fields are removed and resolved through IDs.
- All quality gates pass without exceptions.

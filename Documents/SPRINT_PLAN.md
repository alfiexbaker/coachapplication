# Sprint 1 · Foundational Discovery Rails

## Objectives
- Replace Expo starter layout with domain-specific tabs (Discover, Bookings, Availability, Profile).
- Establish reusable UI primitives (SurfaceCard, Chip, Badge, SectionHeader) sourced from the design tokens in `constants/theme.ts`.
- Prototype the dual-pane coach discovery experience with filter chips, contextual map preview, and sprint labeling for review checkpoints.

## Deliverables Landed
1. **Coach discovery pane** – `clubroom/app/(tabs)/index.tsx`
   - Filter schema hooked to chip interactions and a responsive map preview.
   - Coach list cards reflect MVP data points (badges, price range, formats, availability).
2. **Bookings + Coach Ops tabs** – `clubroom/app/(tabs)/bookings.tsx`, `clubroom/app/(tabs)/availability.tsx`
   - Booking cards visualize the state machine copy from `Documents/S1_MVP_CORE.md`.
   - Availability grid demonstrates drag-ready cells with highlight styles tied to theme tokens.
3. **Profile trust surface** – `clubroom/app/(tabs)/profile.tsx`
   - Settings placeholders communicate dependencies on future sprints (messaging, payments, verification).
4. **Token + data foundations** – `clubroom/constants/theme.ts`, `clubroom/constants/types.ts`, `clubroom/constants/mock-data.ts`
   - Shared models unlock consistent styling + sample data for rapid iteration.

## Next Sprint Hooks
- Wire geo-filter state and search-to-map synchronization to real data sources.
- Layer booking mutations + calendar sync simulation onto the existing cards.
- Build verification badge upload flows once Trust & Payments pillar unlocks.

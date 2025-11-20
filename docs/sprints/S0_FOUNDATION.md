# S0 Foundation

## Product North Star
- **Mission statement**: Deliver a premium, trusted ecosystem that connects parents with elite football coaches while giving coaches a complete operating system for availability, bookings, and long-term performance tracking.
- **Pillar alignment**: This file anchors the six pillars (Discovery, Bookings, Coach Ops, Messaging, Performance, Trust & Payments) so every sprint-level doc can reference shared principles.
- **Platform scope**: Native-quality experience on both iOS and Android via React Native + Expo, with backend APIs powered by Next.js API routes (TypeScript + Zod) and Prisma/Supabase for persistence when implemented.

## Experience Principles (Make It Look & Feel Premium)
- **Athletic visual language**: Dark surfaces with bold accent gradients, hero photography, and motion micro-interactions to convey energy and professionalism.
- **Calm density**: Show rich data (availability grids, stats) without overwhelm through modular cards, generous spacing, and progressive disclosure.
- **Trust signals first**: Badges, verification timestamps, testimonials, and safety copy should be surfaced on every relevant screen even before the verification module ships.
- **Cross-platform polish**: Align navigation patterns (tab layout + stacked modals) while honoring platform idioms (Material ripples vs. iOS blur sheets, platform font defaults) documented below.

## Decision Log Template
Record key choices directly in sprint docs referencing this template for traceability.

| Decision | Rationale | Alternatives | Pillars Affected | Review Sprint |
| --- | --- | --- | --- | --- |
| Example: Expo Router for navigation | URL-like segments work for native + future web builds | React Navigation stacks per tab | Discovery, Bookings, Coach Ops | Revisit S2 |

## React Native / Expo + TypeScript Guidelines
- **Project Structure**
  - Keep screens inside `app/(tabs)` with colocated hooks, tests, and stylesheets per feature.
  - Encapsulate reusable UI patterns in `components/` with TypeScript-first APIs.
  - Prefer absolute imports via `tsconfig.json` paths to avoid brittle `../../..` references.
- **Expo Workflow**
  - Use Expo Router for navigation and rely on `expo-doctor` before each release build.
  - When native modules are required, configure them with Expo prebuild and document platform-specific steps inside `/Documents`.
  - Keep `app.json`/`app.config.ts` as the single source for app identifiers, icons, and splash assets.
- **TypeScript Practices**
  - Enable `strict` mode and avoid `any`; type third-party modules with `.d.ts` shims when needed.
  - Define shared domain models (e.g., `Booking`, `CoachProfile`) in `constants/types.ts` and reuse across screens, hooks, and API layers.
  - Use React hooks with typed params/returns (`useQuery<Booking[]>`) and leverage React Navigation's `ParamList` types for route safety.
- **Styling & State**
  - Centralize spacing, color, and typography tokens under `constants/theme.ts`; import tokens instead of hard-coded values.
  - Use `StyleSheet.create` or `styled` helpers with token references to maintain consistency across iOS, Android, and web.
  - Favor React Query/Zustand/Recoil for client state, keeping async side effects inside hooks, not components.

## Navigation Hierarchy
- **Primary Tabs** (Expo Router tab layout)
  - `Discover` – default landing tab surfacing featured clubs, search, and recommendations.
  - `Bookings` – list of upcoming/past reservations with entry points to modify or cancel.
  - `Availability` – calendar-style view for coaches to set or review open time slots.
  - `Profile` – user settings, membership details, and support links.
- **Nested Navigation**
  - Each tab can push detail stacks (e.g., `DiscoverStack` handles search filters, listing details, and map views) while preserving tab state.
  - Shared modals (e.g., `NewBookingModal`) should be registered in a root stack presented above the tabs to avoid duplicated definitions.

## Theming Tokens (iOS & Android)
- **Colors**
  - `color.background` – `#FFFFFF` (light) / `#06080F` (dark).
  - `color.surface` – `#F4F6FB` (light) / `#111828` (dark).
  - `color.primary` – `#1D4ED8` for brand actions; add `primaryDark: #153EAE` for pressed states.
  - `color.secondary` – `#F97316` for highlights and availability badges.
  - `color.success` – `#10B981`, `color.warning` – `#FACC15`, `color.error` – `#EF4444`.
  - Text colors: `color.text` (`#0F172A` light / `#E2E8F0` dark) and `color.muted` (`#475569` light / `#94A3B8` dark).
- **Typography**
  - Font families: `Inter` (iOS/web) / `Roboto` (Android) with Expo Google Fonts fallback.
  - Token scale: `font.xs 12`, `font.sm 14`, `font.base 16`, `font.lg 18`, `font.xl 20`, `font.2xl 24`, `font.3xl 30` (values in sp/pt).
  - Line heights: multiply font size by `1.4` for body, `1.2` for headings to maintain readability.
- **Spacing**
  - Base unit `4px` applied consistently: `space.xs 4`, `space.sm 8`, `space.md 12`, `space.lg 16`, `space.xl 24`, `space.2xl 32`, `space.3xl 40`.
  - Apply responsive padding: screens use `space.xl` horizontal padding on tablets, `space.lg` on phones.
  - Component guidelines: buttons use `space.md` vertical + `space.xl` horizontal padding; cards use `space.lg` padding with `space.md` corner radius.

These foundations should be mirrored across mobile platforms and web previews to ensure consistent UX from day one.

## Accessibility & Haptics Checklist
- Support Dynamic Type / Font Scaling up to 130% with graceful layout adjustments.
- Minimum contrast ratio 4.5:1 for text; use semantic colors for success/warning/error states.
- Enable VoiceOver/TalkBack focus order testing each sprint; describe imagery (coach hero shots, map pins) with concise accessibility labels.
- Provide tactile confirmation (Haptic selection/impact) for booking confirmations, slot selections, and drag gestures on availability calendars.

## Offline & Resilience Considerations
- Cache last-known discoveries and bookings using React Query persisters; stale data clearly timestamped.
- Queue critical mutations (booking request, availability changes) with optimistic UI; replay when network returns.
- Graceful degradation for map tiles: fall back to list-only view when Mapbox/Google tiles fail.

## Collaboration Notes
- Use `/Documents` sprint files as single source; append decisions rather than overwriting to keep iteration history.
- Cross-link sections (e.g., Booking flow state machine in `S1_MVP_CORE.md`) for faster onboarding of contributors.

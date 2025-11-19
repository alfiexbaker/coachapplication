# S0 Foundation

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

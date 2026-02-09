# Sprint 5 — Screen Architecture — Agent Prompts

---

## Agent 1: Tab Screens + ErrorBoundary

```
You are a Screen Architecture agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Retrofit useScreen() hook into all tab screens and add ErrorBoundary wrapping to layout files.

Read memory/sprints/sprint-5-screen-arch/Agent1Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — you ONLY modify:
  clubroom/app/(tabs)/_layout.tsx
  clubroom/app/(tabs)/index.tsx
  clubroom/app/(tabs)/athletes.tsx
  clubroom/app/(tabs)/roster.tsx
  clubroom/app/(tabs)/schedule.tsx
  clubroom/app/(tabs)/club-hub.tsx
  clubroom/app/(tabs)/availability.tsx
  clubroom/app/(tabs)/badges.tsx
  clubroom/app/(tabs)/bookings/*.tsx
  clubroom/app/(tabs)/children.tsx
  clubroom/app/(tabs)/coach-profile.tsx
  clubroom/app/(tabs)/edit-profile.tsx
  clubroom/app/(tabs)/feed.tsx
  clubroom/app/(tabs)/messages.tsx
  clubroom/app/(tabs)/more.tsx
  clubroom/app/(tabs)/notifications.tsx
  clubroom/app/(tabs)/profile.tsx
  clubroom/app/(tabs)/settings.tsx
  clubroom/app/(tabs)/wallet.tsx
  clubroom/app/(tabs)/admin/*.tsx
  clubroom/app/(modal)/_layout.tsx
  clubroom/app/_layout.tsx               (ErrorBoundary only)

DO NOT TOUCH: Any screen in app/ outside tabs/modals/root layout. Those belong to Agents 2/3/4.

REFERENCE FILES TO READ FIRST:
- clubroom/hooks/use-screen.ts — understand the useScreen() API
- clubroom/components/ui/screen-states.tsx — LoadingState, ErrorState, EmptyState components
- clubroom/components/error-boundary.tsx — ErrorBoundary component

useScreen() PATTERN:
```typescript
import { useScreen } from '@/hooks/use-screen';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';

export default function MyScreen() {
  const { data, loading, error, refreshing, handleRefresh } = useScreen({
    key: 'my-screen',
    fetch: async () => {
      // Load data from services
      const result = await myService.getAll();
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    events: ['RELEVANT_EVENT'],  // auto-refresh when these fire
  });

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={handleRefresh} message={error.message} />;
  if (!data || data.length === 0) return <EmptyState title="Nothing here" subtitle="Get started by..." />;

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      {/* Success state content */}
    </ScrollView>
  );
}
```

ErrorBoundary PATTERN (for _layout.tsx files):
```typescript
import { ErrorBoundary } from '@/components/error-boundary';

export default function Layout() {
  return (
    <ErrorBoundary>
      <Tabs>...</Tabs>
    </ErrorBoundary>
  );
}
```

PROCESS:
1. Add ErrorBoundary to app/_layout.tsx (root) — wrap the main Stack/Slot
2. Add ErrorBoundary to app/(tabs)/_layout.tsx — wrap the Tabs component
3. Add ErrorBoundary to app/(modal)/_layout.tsx if it exists
4. For each tab screen:
   a. Read the file
   b. Identify what data it loads (services called, useState for data)
   c. Replace manual loading/error state with useScreen()
   d. Add all 4 state branches: loading, error, empty, success
   e. Add pull-to-refresh via RefreshControl
   f. Wire relevant event bus events for auto-refresh

RULES:
1. useScreen() replaces manual useState + useEffect for data loading
2. ALL 4 state branches are mandatory — no screen without loading/error/empty
3. Pick appropriate events from event-bus.ts (read it first)
4. useScreen key should be unique per screen (e.g., 'tab-athletes', 'tab-schedule')
5. Keep screen files ≤250 lines — if too long, the data fetching logic goes into the useScreen fetch callback

SAFETY CHECKS:
1. Every owned screen imports useScreen
2. Every owned screen has 4 state branches (loading/error/empty/success)
3. ErrorBoundary wraps tab layout and root layout
4. grep -rn "useScreen" <each owned file> → exists
5. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-5-screen-arch/Agent1Update.md with Status: DONE.
```

---

## Agent 2: useScreen() Retrofit — Screens A-D

```
You are a Screen Architecture agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Retrofit useScreen() into all screen files in app/ directories A through D.

Read memory/sprints/sprint-5-screen-arch/Agent2Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — you ONLY modify screen files in:
  clubroom/app/academy/**/*.tsx
  clubroom/app/admin/**/*.tsx
  clubroom/app/analytics/**/*.tsx
  clubroom/app/athlete/**/*.tsx
  clubroom/app/availability/**/*.tsx
  clubroom/app/badges/**/*.tsx
  clubroom/app/book/**/*.tsx
  clubroom/app/book-coach.tsx
  clubroom/app/booking/**/*.tsx
  clubroom/app/bookings/**/*.tsx
  clubroom/app/carpool/**/*.tsx
  clubroom/app/chat/**/*.tsx
  clubroom/app/child/**/*.tsx
  clubroom/app/children/**/*.tsx
  clubroom/app/club/**/*.tsx
  clubroom/app/coach/**/*.tsx
  clubroom/app/coach-invites.tsx
  clubroom/app/community/**/*.tsx
  clubroom/app/compare/**/*.tsx
  clubroom/app/confirm-booking.tsx
  clubroom/app/development/**/*.tsx
  clubroom/app/discover/**/*.tsx
  clubroom/app/discover-sessions.tsx
  clubroom/app/drills/**/*.tsx

DO NOT TOUCH: (tabs)/ screens (Agent 1), layout files (Agent 1), E-Z screens (Agents 3/4).

Same useScreen() + 4 state branch pattern as Agent 1. Read hooks/use-screen.ts first.

SKIP _layout.tsx files in these directories — they don't need useScreen().

For form screens (create.tsx, edit-template.tsx), useScreen() loads initial data (e.g., existing values for edit). The form itself uses local state.

SAFETY CHECKS:
1. Every owned screen uses useScreen()
2. Every owned screen has 4 state branches
3. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-5-screen-arch/Agent2Update.md with Status: DONE.
```

---

## Agent 3: useScreen() Retrofit — Screens E-P

```
You are a Screen Architecture agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Retrofit useScreen() into all screen files in app/ directories E through P.

Read memory/sprints/sprint-5-screen-arch/Agent3Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — you ONLY modify screen files in:
  clubroom/app/earnings.tsx
  clubroom/app/events/**/*.tsx
  clubroom/app/family/**/*.tsx
  clubroom/app/favourites/**/*.tsx
  clubroom/app/goals/**/*.tsx
  clubroom/app/group-sessions/**/*.tsx
  clubroom/app/health/**/*.tsx
  clubroom/app/invites.tsx
  clubroom/app/invoices/**/*.tsx
  clubroom/app/matches/**/*.tsx
  clubroom/app/packages/**/*.tsx

DO NOT TOUCH: (tabs)/ (Agent 1), A-D screens (Agent 2), Q-Z screens (Agent 4).

Same useScreen() + 4 state branch pattern as Agent 1.

SAFETY CHECKS:
1. Every owned screen uses useScreen()
2. Every owned screen has 4 state branches
3. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-5-screen-arch/Agent3Update.md with Status: DONE.
```

---

## Agent 4: useScreen() Retrofit — Screens Q-Z + Modals

```
You are a Screen Architecture agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Retrofit useScreen() into remaining screen files (Q-Z) and all modal screens.

Read memory/sprints/sprint-5-screen-arch/Agent4Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — you ONLY modify screen files in:
  clubroom/app/rate-coach.tsx
  clubroom/app/referrals/**/*.tsx
  clubroom/app/review/**/*.tsx
  clubroom/app/roster/**/*.tsx
  clubroom/app/session/**/*.tsx
  clubroom/app/session-invites/**/*.tsx
  clubroom/app/session-notes/**/*.tsx
  clubroom/app/sessions/**/*.tsx
  clubroom/app/settings/**/*.tsx
  clubroom/app/skills/**/*.tsx
  clubroom/app/squads/**/*.tsx
  clubroom/app/verification/**/*.tsx
  clubroom/app/videos/**/*.tsx
  clubroom/app/waitlist/**/*.tsx
  clubroom/app/wallet/**/*.tsx
  clubroom/app/(modal)/**/*.tsx          (all modal screens, NOT _layout)

DO NOT TOUCH: (tabs)/ (Agent 1), A-D (Agent 2), E-P (Agent 3), layout files.

Same useScreen() + 4 state branch pattern as Agent 1.

For modal screens: useScreen() still applies — modals load data too. The modal chrome (close button, header) stays; the data loading moves to useScreen().

For settings screens: some are pure forms with no fetched data. For those, useScreen() can return static config or skip data loading. Still add the 4 branches for consistency.

SAFETY CHECKS:
1. Every owned screen uses useScreen()
2. Every owned screen has 4 state branches
3. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-5-screen-arch/Agent4Update.md with Status: DONE.
```

# Design Sprint Agent 2: Empty State Redesign

**Agent Assignment**: Agent 2
**Priority**: MEDIUM (visual quality, not functional breakage)
**Estimated Files**: ~14
**Conflict Zone**: NONE (Agent 1 owns card density/bugs, Agent 3 owns avatars/charts/analytics)
**Owns**: `components/ui/empty-state.tsx` -- this is the single source of truth for empty states

---

## Design Principle

**CRITICAL**: The user said "I don't like obvious in-your-face CTAs. The people know how to do stuff. Should be a 'if you wanna' approach."

This means empty states should feel like:
- A calm explanation of what this area is for
- A subtle hint about how to get started, when you're ready
- NOT "CREATE YOUR FIRST SESSION NOW!" with a big tinted button
- Think: Stripe's empty dashboard sections, Linear's empty project state

The current EmptyState component (`components/ui/empty-state.tsx`) uses: tiny grey icon in circle, bold heading, one line of body text, and optionally a full primary-colored pill button with shadow. Every screen that uses it looks identical and lifeless.

---

## Part 1: Redesign the EmptyState Component

### 1.1 Redesign `components/ui/empty-state.tsx`

**File**: `components/ui/empty-state.tsx`
**What's broken**: Every empty state in the app looks the same: grey icon circle, bold title, single line description, optional loud primary button. It's the definition of generic -- no personality, no context, no warmth.
**Current props**: `icon`, `title`, `message`, `actionLabel`, `onPressAction`

**New design direction**:
- Keep the same props interface for backward compatibility (plus add optional new ones)
- Replace the grey circle icon with a **larger, softer icon** (size 40 instead of 24, using `withAlpha(palette.tint, 0.08)` background instead of `withAlpha(palette.border, 0.19)`)
- Icon container should be 64px circle (not the current tight padding)
- Title uses `Typography.heading` -- this is fine, keep it
- Message uses `Typography.bodySmall` at `palette.muted` -- fine, but increase `lineHeight` to 22 for readability
- **Replace the CTA button**: Instead of a loud primary pill button with shadow and elevation, use a **text link** style: just `palette.tint` colored text with `Typography.bodySemiBold`, no background, no shadow. Like a "Learn more" link, not a "DO IT NOW" button.
- Add optional `secondaryMessage` prop for a second line of subtle context
- Add 8px more vertical spacing between icon and title (`gap: Spacing.sm` instead of `Spacing.xs`)

**New props interface**:
```typescript
type EmptyStateProps = {
  icon?: string;
  title: string;
  message: string;
  secondaryMessage?: string;  // NEW: extra context line
  actionLabel?: string;
  onPressAction?: () => void;
  compact?: boolean;  // NEW: for embedded usage (smaller icon, tighter spacing)
};
```

**Specific style changes**:
- `container`: change `gap` from `Spacing.xs` (8px) to `Spacing.sm` (16px). Add `paddingVertical: Spacing.xl` (40px) for breathing room.
- `iconContainer`: change to `width: 64, height: 64, borderRadius: 32` (full circle). Change background from `withAlpha(palette.border, 0.19)` to `withAlpha(palette.tint, 0.06)`. This gives a soft brand-tinted background instead of dead grey.
- Icon size: increase from 24 to 32. Color: change from `palette.icon` to `withAlpha(palette.tint, 0.6)` for a softer tint.
- `title`: keep `Typography.heading`, `textAlign: 'center'`.
- `message`: keep `Typography.bodySmall`, add `maxWidth: 280` for better line length on wide screens.
- `action` style: **remove** `backgroundColor`, `shadowOpacity`, `shadowRadius`, `shadowOffset`, `elevation`, `borderRadius: Radii.pill`. Replace with just `marginTop: Spacing.sm`.
- `actionLabel` style: change from `Typography.bodySemiBold` to `Typography.bodySmallSemiBold`. Color should be `palette.tint` (not `palette.onPrimary`). Remove the pressed state background color change -- just use opacity change on press.
- When `compact` is true: use 48px icon container, size 24 icon, `Spacing.xs` gaps, no extra paddingVertical.
- When `secondaryMessage` is provided: render it below `message` with `Typography.small` at `palette.muted`, `marginTop: Spacing.xxs`.

**The vibe**: Icon is a soft, tinted circle (not a grey prison). Title tells you what this area is for. Message gives calm context. Action label is a subtle "you could do this" text link, not a screaming button.

**Verify**: The component should look like a Stripe empty state -- clean, informative, with a subtle text action. NOT like a generic "nothing here yet" template.

---

## Part 2: Update Empty State Content Per Screen

Each screen currently passes generic, unhelpful text to EmptyState. Update the `title`, `message`, and `actionLabel` to be contextual, warm, and NOT pushy.

### 2.1 Discover Sessions

**File**: `app/discover-sessions.tsx` (around line 67-73 for the empty state usage)
**Current**: Generic empty state for no sessions found
**New content**:
```
icon: "compass-outline"
title: "No sessions available"
message: "Coaching sessions will appear here as coaches publish their availability. Check back soon."
secondaryMessage: "You can also search by skill or session type above."
```
No action button. The user already has the search/filter controls visible above.

### 2.2 Community Hub

**File**: `app/community/index.tsx` (check where EmptyState is used)
**Also**: `components/community/community-tab-content.tsx`
**Current**: Generic empty for no groups
**New content**:
```
icon: "people-outline"
title: "No groups yet"
message: "Parent groups help you coordinate with other families. They appear here once you join or create one."
actionLabel: "Browse groups"
```

### 2.3 Drills / My Drills

**File**: `app/drills/index.tsx`
**Current**: Generic empty
**New content**:
```
icon: "fitness-outline"
title: "No drills assigned"
message: "When your coach assigns practice drills, they will show up here. Focus on your sessions for now."
```
No action button -- the coach assigns drills, not the athlete.

### 2.4 Challenges

**File**: `app/drills/challenges.tsx`
**Current**: Generic empty
**New content**:
```
icon: "trophy-outline"
title: "No active challenges"
message: "Challenges are a way to push yourself between sessions. Your coach can set these up for you."
```
No action button.

### 2.5 Goals

**File**: `app/analytics/[athleteId]/goals.tsx`
**Current**: Generic empty
**New content**:
```
icon: "flag-outline"
title: "No goals set"
message: "Goals help track long-term development. You can set targets together with your coach during sessions."
actionLabel: "Learn about goals"
```

### 2.6 Favourites

**File**: `app/favourites/index.tsx`
**Current**: Generic empty
**New content**:
```
icon: "heart-outline"
title: "No favourites yet"
message: "Tap the heart on any coach profile to save them here for quick access."
```
No action button -- the user adds favourites from coach profiles.

### 2.7 Waitlist

**File**: `app/waitlist/index.tsx`
**Current**: Generic empty
**New content**:
```
icon: "time-outline"
title: "No waitlist entries"
message: "When you join a waitlist for a full session, it will appear here. You will be notified when a spot opens."
```
No action button.

### 2.8 Invites

**File**: `app/invites.tsx`
**Current**: Generic empty
**New content**:
```
icon: "mail-outline"
title: "No pending invites"
message: "Session invites from coaches will appear here. You are all caught up."
```
No action button.

### 2.9 Children tab

**File**: `app/(tabs)/children.tsx`
**Current**: Generic empty
**New content**:
```
icon: "people-outline"
title: "No children added"
message: "Add your children to book sessions, track their development, and manage their schedules."
actionLabel: "Add a child"
```
This is one of the few screens where a subtle action link makes sense -- a parent needs to add children to use the app.

### 2.10 Session Invites

**File**: `app/session-invites/index.tsx`
**Current**: Generic empty
**New content**:
```
icon: "calendar-outline"
title: "No session invites"
message: "When a coach invites you or your child to a session, it will show up here."
```
No action button.

### 2.11 Badges tab (empty case)

**File**: `app/(tabs)/badges.tsx`
**Current**: Generic empty
**New content**:
```
icon: "ribbon-outline"
title: "No badges yet"
message: "Badges are earned through training sessions and milestones. Keep attending sessions to unlock your first badge."
```
No action button -- badges are earned, not created.

### 2.12 Wallet (empty case)

**File**: `app/(tabs)/wallet.tsx` (line 111-127, the empty status branch)
**Current**: Uses EmptyState with `actionLabel="Retry"` and `onPressAction={retry}` -- this is wrong for an empty state (not an error).
**New content**:
```
icon: "wallet-outline"
title: "Wallet is empty"
message: "Your wallet balance and transaction history will appear here once you add funds or receive payments."
```
Remove the `actionLabel="Retry"` and `onPressAction={retry}` -- an empty wallet is not an error to retry.

### 2.13 Earnings (empty case)

**File**: `app/earnings.tsx` (line 53-65, the empty status branch)
**Current**: `title="No earnings yet"`, `message="Complete your first paid session to start tracking earnings."`
**New content**:
```
icon: "cash-outline"
title: "No earnings yet"
message: "Your earnings dashboard will come alive once you complete your first paid session. Pending and completed payments will all be tracked here."
```
No action button. Slightly warmer messaging.

---

## Part 3: Notification Panel Empty States

### 3.1 Notification panel inline empty states

**File**: `components/notification/notifications-panel.tsx`
**What's broken**: Lines 139-144 (compact mode) and lines 181-191 (full mode) have inline empty states that don't use the `EmptyState` component. They use raw Views with hardcoded spacing.
**Fix**:
- Replace the compact empty state (lines 139-144) with `<EmptyState compact icon="notifications-off-outline" title="All caught up" message="No new notifications." />`
- Replace the full-mode empty state (lines 181-191) with `<EmptyState icon="notifications-off-outline" title="No notifications" message={currentFilter === 'all' ? 'You are all caught up. New notifications will appear here.' : \`No \${currentFilter} notifications right now.\`} />`
- This ensures consistent styling with the redesigned EmptyState.

---

## Order of Operations

1. **Redesign `components/ui/empty-state.tsx`** -- this is the foundation. Everything else depends on it.
2. **Update notification panel inline empty states** (3.1) -- convert to use EmptyState component.
3. **Update screen empty states** (2.1-2.13) -- one by one, updating text content.
4. **Visual review** -- scroll through each screen in empty state to verify the new design feels right.

---

## Quality Gate

- [ ] EmptyState component has new visual design: larger soft-tinted icon circle, subtle text-link action (not pill button)
- [ ] Every empty state in the app has contextual, helpful text (not generic "No items yet")
- [ ] NO empty state has a big primary-colored pill button. Actions are subtle text links.
- [ ] Empty states that don't need an action (Drills, Challenges, Waitlist, Invites) have NO action button
- [ ] Empty states that need an action (Children, Community) have a calm text-link action
- [ ] Wallet empty state no longer shows "Retry" button (it's not an error)
- [ ] Notification panel uses the EmptyState component instead of inline Views
- [ ] The `compact` prop works for embedded usage (notification panel compact mode)
- [ ] `secondaryMessage` prop renders when provided
- [ ] Backward compatibility: all existing EmptyState usages still compile and render
- [ ] TypeScript compiles: `npx tsc -p tsconfig.test.json`

---

## Files Touched (complete list)

| File | Action |
|------|--------|
| `components/ui/empty-state.tsx` | Full redesign -- visual style + new props |
| `app/discover-sessions.tsx` | Update empty state content |
| `app/community/index.tsx` | Update empty state content |
| `components/community/community-tab-content.tsx` | Update empty state content |
| `app/drills/index.tsx` | Update empty state content |
| `app/drills/challenges.tsx` | Update empty state content |
| `app/analytics/[athleteId]/goals.tsx` | Update empty state content |
| `app/favourites/index.tsx` | Update empty state content |
| `app/waitlist/index.tsx` | Update empty state content |
| `app/invites.tsx` | Update empty state content |
| `app/(tabs)/children.tsx` | Update empty state content |
| `app/session-invites/index.tsx` | Update empty state content |
| `app/(tabs)/badges.tsx` | Update empty state content |
| `app/(tabs)/wallet.tsx` | Update empty state content (remove Retry action) |
| `app/earnings.tsx` | Update empty state content |
| `components/notification/notifications-panel.tsx` | Convert inline empty states to EmptyState component |

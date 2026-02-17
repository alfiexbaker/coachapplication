# Design Sprint Agent 3: Visual Polish (Avatars, Charts, Brand Color)

**Agent Assignment**: Agent 3
**Priority**: MEDIUM (visual quality improvement, not functional breakage)
**Estimated Files**: ~16
**Conflict Zone**: NONE (Agent 1 owns card density/bugs, Agent 2 owns empty-state.tsx)
**Owns**: `components/ui/primitives/Avatar.tsx`, analytics screen visuals, earnings screen visuals

---

## Design Principle

Subtle, confident, calm. No flashy gradients or neon colors. Think Stripe's dashboard -- data visualized cleanly, avatars that are distinguishable at a glance, strategic use of brand color to break grey monotony. The app should feel warm and alive, not like a grey spreadsheet.

---

## Part 1: Color-Coded Letter Avatars

### 1.1 Redesign Avatar fallback colors

**File**: `components/ui/primitives/Avatar.tsx`
**What's broken**: When no image is provided, every avatar shows the same look: `withAlpha(colors.tint, 0.09)` background with `colors.tint` initials (lines 103-106). This means every letter avatar is the same pale tint color. In a list of 10 athletes, you can't visually distinguish anyone. It's a wall of identical grey-tinted circles.
**Why it matters**: Letter avatars are the primary visual identifier when photos aren't uploaded. Identical colors make lists feel monotonous and harder to scan.

**Fix -- add a deterministic color palette**:

Add a `AVATAR_COLORS` array of 12 harmonious, muted pastel background colors with their corresponding darker text colors. These should be calm, not neon:

```typescript
const AVATAR_COLORS: { bg: string; text: string }[] = [
  { bg: '#E8F0FE', text: '#1967D2' },  // Blue
  { bg: '#E6F4EA', text: '#1E8E3E' },  // Green
  { bg: '#FEF7E0', text: '#D36E08' },  // Amber
  { bg: '#FCE8E6', text: '#C5221F' },  // Red
  { bg: '#F3E8FD', text: '#8430CE' },  // Purple
  { bg: '#E8F7FD', text: '#0B7285' },  // Teal
  { bg: '#FDE8F0', text: '#C2185B' },  // Pink
  { bg: '#E8EAF6', text: '#3949AB' },  // Indigo
  { bg: '#FFF3E0', text: '#E65100' },  // Orange
  { bg: '#E0F2F1', text: '#00695C' },  // Cyan
  { bg: '#F1F8E9', text: '#558B2F' },  // Lime
  { bg: '#EFEBE9', text: '#5D4037' },  // Brown
];
```

Add a deterministic hash function that converts a name to a color index:

```typescript
function getAvatarColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % AVATAR_COLORS.length;
}
```

**Changes to the component**:
- In `AvatarInner` (line 89), compute the color based on `name`:
  ```typescript
  const avatarColor = name ? AVATAR_COLORS[getAvatarColorIndex(name)] : null;
  ```
- Update the `themedStyles` useMemo (line 100) to use the computed color:
  ```typescript
  placeholder: {
    backgroundColor: avatarColor?.bg ?? withAlpha(colors.tint, 0.09),
  },
  initials: { color: avatarColor?.text ?? colors.tint },
  ```
- This means: if a name is provided, use a deterministic color. If no name, fall back to the current tint-based color. Same name always gets the same color across the entire app.

**Dark mode consideration**: These pastel backgrounds may look washed out in dark mode. Add a dark mode variant:
```typescript
// In the themedStyles useMemo, check scheme:
const { colors, scheme } = useTheme();
// For dark mode, use the text color as bg (at low opacity) and keep text color bright
placeholder: {
  backgroundColor: scheme === 'dark'
    ? withAlpha(avatarColor?.text ?? colors.tint, 0.15)
    : avatarColor?.bg ?? withAlpha(colors.tint, 0.09),
},
initials: {
  color: scheme === 'dark'
    ? avatarColor?.text ?? colors.tint  // bright on dark bg
    : avatarColor?.text ?? colors.tint,
},
```

**Verify**: Open the Athletes list. Each athlete should have a different-colored avatar circle. "John Smith" should always be the same color everywhere he appears (deterministic). Dark mode should also look good.

---

### 1.2 Update inline avatar implementations

Several components build their own letter avatars instead of using the Avatar primitive. These need to either use the Avatar component or at least use the same color logic.

**File**: `components/roster/athlete-row.tsx`
**What's broken**: Lines 70-71 build an inline avatar with `backgroundColor: palette.border` -- always grey.
**Fix**: Replace the inline avatar View + ThemedText with the Avatar component:
```tsx
import { Avatar } from '@/components/ui/primitives/Avatar';
// Replace lines 70-71:
<Avatar name={athleteName} size="md" />
```
Remove the `avatarPlaceholder` and `avatarText` styles (lines 184-191) -- no longer needed.

**File**: `components/roster/athlete-card.tsx`
**What's broken**: Has its own `getInitials` helper (line 21-27) and likely builds inline avatars.
**Fix**: Replace inline avatar with `<Avatar name={athleteName} size="md" />`. Remove the local `getInitials` function.

**File**: `components/invite/invite-list-card.tsx`
**What's broken**: Uses inline letter avatar with hardcoded grey background.
**Fix**: Replace with Avatar component.

**File**: `components/favourites/FavouriteCoachCard.tsx`
**What's broken**: Uses inline letter avatar.
**Fix**: Replace with Avatar component.

**File**: `components/messaging/conversation-row.tsx`
**What's broken**: Uses inline letter avatar.
**Fix**: Replace with Avatar component.

**File**: `components/social/comment-card.tsx`
**What's broken**: Uses inline letter avatar.
**Fix**: Replace with Avatar component.

For each file:
1. Import `Avatar` from `@/components/ui/primitives/Avatar`
2. Replace the inline View + Text avatar with `<Avatar name={personName} size="sm|md" />`
3. Remove any local `getInitials` helper if it becomes unused
4. Remove the associated avatar placeholder styles

**Verify**: Every list with people (Athletes, Conversations, Comments, Invites, Favourites) should show color-coded avatars, not identical grey circles.

---

## Part 2: Data Visualization for Earnings

### 2.1 Add sparkline/mini chart to Earnings balance card

**File**: NEW `components/earnings/earnings-sparkline.tsx`
**Why**: The Earnings screen is a financial dashboard with zero charts. Just numbers in cards. A coach can't see trends -- are earnings going up or down this month? A simple sparkline communicates trend at a glance.

**Implementation**:
- Use `react-native-svg` (already installed) to draw a simple SVG sparkline
- Component: `EarningsSparkline` -- takes an array of `{ date: string; amount: number }[]` and renders a thin line chart
- Height: 40px. Width: fills container. No axes, no labels -- just the line.
- Line color: `colors.success` (green for earnings)
- Fill: `withAlpha(colors.success, 0.06)` area fill below the line
- If data has < 3 points, don't render (not enough for a meaningful line)

```typescript
interface EarningsSparklineProps {
  data: { date: string; amount: number }[];
  height?: number;
  color?: string;
}
```

- Use SVG `Path` with smooth curves (catmull-rom to cubic bezier conversion, or simple `polyline` for v1)
- No interactivity needed -- just a visual indicator of trend

**File**: `components/earnings/earnings-balance-card.tsx`
**Fix**: Import and render `EarningsSparkline` below the balance amount and above the details section. Pass the transaction history as data points.
- Add an optional `recentAmounts` prop to `EarningsBalanceCardProps`
- Render `<EarningsSparkline data={recentAmounts} />` between the header and divider

**Verify**: Earnings screen shows a subtle green sparkline below the balance number, giving an at-a-glance trend of recent earnings.

---

### 2.2 Add mini stat bars to Analytics screen

**File**: `components/coach/analytics-screen-sections.tsx`
**What's broken**: The analytics stat cards show numbers but no visual context. "24 Sessions" means nothing without knowing if that's up or down from last month.
**Fix**: Add a thin horizontal progress/comparison bar inside each `AnalyticsStatCard`.

Add a new optional prop to `AnalyticsStatCardProps`:
```typescript
progressPercent?: number;  // 0-100, represents current vs target or vs last period
```

When `progressPercent` is provided, render a thin bar (4px height, full width) below the label:
```tsx
{progressPercent != null && (
  <View style={[styles.progressTrack, { backgroundColor: withAlpha(iconColor, 0.08) }]}>
    <View style={[styles.progressFill, { backgroundColor: iconColor, width: `${progressPercent}%` }]} />
  </View>
)}
```

Styles:
```typescript
progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: Spacing.xxs },
progressFill: { height: '100%', borderRadius: 2 },
```

**File**: `components/coach/analytics-screen.tsx`
**Fix**: Pass `progressPercent` to each stat card. For v1, use simple heuristics:
- Sessions: `(sessionsCount / 30) * 100` (target 30/month)
- Active Clients: `(activeClients / 20) * 100` (target 20)
- Avg Rating: `(avgRating / 5) * 100`
- Revenue: cap at 100 for any positive revenue

**Verify**: Each analytics stat card shows a thin colored progress bar below the label, giving visual weight to the numbers.

---

## Part 3: Break Visual Monotony with Brand Color

### 3.1 Add accent color strips to key section headers

The app is grey-card-on-grey-background everywhere. Strategic use of the brand tint color can add warmth without being loud.

**File**: `components/primitives/section-header.tsx`
**What's broken**: Section headers are plain text. No visual differentiation between sections.
**Fix**: Add an optional `accent` prop. When true, render a 3px-wide, 20px-tall vertical bar in `colors.tint` to the left of the title:
```tsx
{accent && (
  <View style={{ width: 3, height: 20, borderRadius: 1.5, backgroundColor: colors.tint, marginRight: Spacing.xs }} />
)}
```
This is a Linear-style accent bar. Subtle, not shouty.

**Verify**: Sections with `accent` prop show a small tint-colored bar. Without the prop, no change.

---

### 3.2 Warm up the coach's home screen

**File**: `components/coach/development-screen.tsx` and `components/coach/development-sections.tsx`
**What's broken**: The coach home screen is functional but visually flat. All cards look the same -- no visual hierarchy telling the coach what needs attention.
**Fix**:
- For the "Awaiting Completion" cards (sessions needing post-session notes), add a subtle left border in `colors.warning` (3px, borderLeftWidth + borderLeftColor).
- For the "Attention Athletes" section, add a subtle left border in `colors.tint`.
- These are not background color changes -- just a thin accent border on the card's left edge to create visual hierarchy.

Implementation in `development-sections.tsx`:
- `CompletionCard`: add `style={{ borderLeftWidth: 3, borderLeftColor: palette.warning }}` to the SurfaceCard
- `AttentionSection` cards: add `style={{ borderLeftWidth: 3, borderLeftColor: palette.tint }}` to the SurfaceCard

**Verify**: Coach home screen has visual hierarchy -- completion cards have a warm amber left bar, attention athletes have a tint-colored left bar. Other cards remain neutral.

---

### 3.3 Add subtle gradient to earnings header

**File**: `components/earnings/earnings-balance-card.tsx`
**Note**: Agent 1 owns density changes to this file. Agent 3 should ONLY add the visual treatment, not change spacing.
**Actually**: To avoid file conflicts, Agent 3 should add the visual treatment to a NEW file.

**File**: NEW `components/earnings/earnings-card-background.tsx`
**What**: A subtle gradient overlay component that can wrap or sit behind the balance card content.
- Use `react-native-svg` to render a LinearGradient (NOT expo-linear-gradient since we have svg already)
- Gradient: from `withAlpha(colors.success, 0.04)` to `transparent`, top to bottom
- Height: matches the card content
- This adds a barely-there green tint to the earnings card, making it feel like a financial dashboard rather than a generic card

**However**: If this creates complexity, skip it. The sparkline (2.1) and progress bars (2.2) are higher impact.

---

### 3.4 Enhance the notification filter bar visual

**File**: `components/notification/notification-filter-chip.tsx`
**What's broken**: The active filter chip may not stand out enough from inactive chips, contributing to the "everything looks the same" problem.
**Fix**: Read the file and ensure the active chip uses `colors.tint` background with `colors.onPrimary` text (solid tint, not just a border change). Inactive chips should use `transparent` background with `colors.muted` text.

**Verify**: Tapping a notification filter chip should clearly highlight it with the brand color. Inactive chips are calm and grey.

---

## Part 4: Analytics Visual Improvements (if time permits)

### 4.1 Add a skills bar chart to analytics

**File**: `components/coach/analytics-screen-sections.tsx` (TopSkillsSection)
**What's broken**: Top skills are listed as text: "1. Dribbling 12 sessions". No visual bar to show relative frequency.
**Fix**: Add a horizontal bar behind each skill row showing relative frequency:

In `TopSkillsSection`, after the skill name, render a background bar:
```tsx
<View style={[styles.skillBarTrack, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
  <View style={[
    styles.skillBarFill,
    { backgroundColor: withAlpha(palette.tint, 0.25), width: `${(count / maxCount) * 100}%` }
  ]} />
</View>
```

Where `maxCount = Math.max(...topSkills.map(([_, c]) => c))`.

Styles:
```typescript
skillBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden', flex: 1, marginHorizontal: Spacing.sm },
skillBarFill: { height: '100%', borderRadius: 3 },
```

**Verify**: Top skills section shows horizontal bars next to each skill, with the most-taught skill having the longest bar.

---

## Order of Operations

1. **Avatar color system** (1.1) -- foundation, used by everything else
2. **Replace inline avatars** (1.2) -- apply the new colored avatars across components
3. **Earnings sparkline** (2.1) -- highest visual impact new feature
4. **Analytics progress bars** (2.2) -- quick win for analytics screen
5. **Section header accent** (3.1) -- small global improvement
6. **Coach home screen accents** (3.2) -- visual hierarchy
7. **Skills bar chart** (4.1) -- analytics depth
8. **Filter chip enhancement** (3.4) -- notification polish

---

## Quality Gate

- [ ] Letter avatars are color-coded: same name = same color everywhere in the app
- [ ] At least 8 distinct avatar colors visible when viewing Athletes list with 10+ entries
- [ ] Dark mode avatars look good (not washed out)
- [ ] Earnings screen shows a sparkline below the balance (when data available)
- [ ] Analytics stat cards show thin progress bars
- [ ] No component uses hardcoded grey for avatar backgrounds (search for `palette.border` in avatar contexts)
- [ ] Brand tint color is used strategically -- not everywhere, but in 3-4 key accent points
- [ ] Coach home screen has visual hierarchy (amber/tint left borders on action cards)
- [ ] All new SVG rendering works in both light and dark mode
- [ ] No `any` types introduced
- [ ] TypeScript compiles: `npx tsc -p tsconfig.test.json`

---

## Files Touched (complete list)

| File | Action |
|------|--------|
| `components/ui/primitives/Avatar.tsx` | Add color palette + deterministic hash |
| `components/roster/athlete-row.tsx` | Replace inline avatar with Avatar component |
| `components/roster/athlete-card.tsx` | Replace inline avatar with Avatar component |
| `components/invite/invite-list-card.tsx` | Replace inline avatar with Avatar component |
| `components/favourites/FavouriteCoachCard.tsx` | Replace inline avatar with Avatar component |
| `components/messaging/conversation-row.tsx` | Replace inline avatar with Avatar component |
| `components/social/comment-card.tsx` | Replace inline avatar with Avatar component |
| NEW `components/earnings/earnings-sparkline.tsx` | SVG sparkline component |
| `components/earnings/earnings-balance-card.tsx` | Add sparkline + recentAmounts prop |
| `components/coach/analytics-screen-sections.tsx` | Add progress bars to stat cards + skill bars |
| `components/coach/analytics-screen.tsx` | Pass progressPercent to stat cards |
| `components/primitives/section-header.tsx` | Add optional accent bar |
| `components/coach/development-sections.tsx` | Add accent borders to action cards |
| `components/notification/notification-filter-chip.tsx` | Enhance active chip styling |

---

## Conflict Avoidance Notes

- **Agent 1 also touches `components/roster/athlete-row.tsx`** for density fixes. Agent 3 ONLY replaces the avatar View with the Avatar component (lines 70-71). Agent 1 handles padding/gap changes. If there's a merge conflict on this file, Agent 3's avatar change is a simple substitution that should merge cleanly.
- **Agent 1 also touches `components/earnings/earnings-balance-card.tsx`** for density. Agent 3 adds a sparkline render and prop. These are additive changes to different parts of the file and should merge cleanly.
- **Agent 1 also touches `components/coach/analytics-screen-sections.tsx`** for density. Agent 3 adds progress bars. These changes are additive (new JSX + new styles) and don't conflict with padding changes.
- **Agent 2 owns `components/ui/empty-state.tsx`** -- Agent 3 does NOT touch this file.
- **Agent 2 owns `components/notification/notifications-panel.tsx`** -- Agent 3 only touches `notification-filter-chip.tsx` which is a different file.

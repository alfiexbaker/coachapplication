# Design Sprint Agent 1: Bug Fixes + Card Density Compression

**Agent Assignment**: Agent 1
**Priority**: HIGH (bugs first, then density)
**Estimated Files**: ~18
**Conflict Zone**: NONE (Agent 2 owns empty-state.tsx, Agent 3 owns Avatar.tsx and analytics)

---

## Design Principle

Subtle, confident, calm. No shouty CTAs. The user knows how to use the app. Present information densely and cleanly. Think Linear/Stripe density -- scannable, not padded.

---

## Part 1: Bug Fixes (do these first)

### 1.1 Settings Account: "Email" label renders vertically

**File**: `components/settings/settings-row.tsx`
**What's broken**: The `SettingsRow` component renders `title` and `value` in a flex row, but the `settingContent` View has `flex: 1` and the `valueText` can sometimes get squeezed to zero width, causing text to wrap character-by-character. On the Account screen (`app/settings/account.tsx` line 74-79), the `value={email}` passed to SettingsRow gets truncated vertically when the email is long.
**Why it matters**: The "Email" label or value renders as one character per line -- obviously broken.
**Fix**:
- In `components/settings/settings-row.tsx`, add `numberOfLines={1}` and `ellipsizeMode="tail"` to the `valueText` ThemedText (around line 71).
- Add `flexShrink: 1` to the `valueText` style and `minWidth: 60` so it doesn't collapse to zero.
- Add `flexShrink: 0` to `settingContent` style to prevent the title from being squeezed.
- Ensure the title has `numberOfLines={1}` as well (line 61).

**Verify**: Navigate to Settings > Account with a long email address. Both "Email" label and the email value should render horizontally on single lines, with the value truncating with ellipsis if needed.

---

### 1.2 Athletes screen: names truncated to "ath..."

**File**: `components/roster/athlete-row.tsx`
**What's broken**: The athlete name ThemedText at line 76-78 has `style={styles.name}` which sets `flex: 1`, but it sits inside a `Row` with `gap="xs"` alongside a SEN icon and a status dot. The `numberOfLines={1}` constraint combined with insufficient width causes truncation to just 3-4 characters.
**Why it matters**: Coach can't tell which athlete is which. Core usability failure.
**Fix**:
- In `components/roster/athlete-row.tsx` line 75, change the inner Row from `<Row align="center" gap="xs">` to `<Row align="center" gap="xxs">` to reduce gap between name and status indicators.
- Ensure the name ThemedText (line 76-78) keeps `flex: 1` and `numberOfLines={1}` with implicit `ellipsizeMode="tail"`.
- The real issue is likely the outer Row at line 69: `<Row align="center" gap="md">` gives 24px gap between avatar (48px), info (flex:1), and chevron. Reduce to `gap="sm"` (16px).
- Also check `components/roster/athlete-card.tsx` for the same issue -- its `getInitials` helper at line 21-27 and name display may have the same width constraint.

**Also check**: `components/athlete/athletes-screen-header-sections.tsx` -- the `renderAthleteCard` function may pass a constrained width.

**Verify**: Athletes tab should show full names like "Arthur Thompson" not "Art...". Names should only truncate with ellipsis for genuinely long names (20+ characters).

---

### 1.3 Badges screen: tier labels truncated "FOUNDATI..."

**File**: `components/badges/badge-card.tsx`
**What's broken**: The tier pill at lines 72-86 uses `Typography.caption` with `textTransform: 'uppercase'` and `letterSpacing: 0.5` inside a small pill. The pill has `paddingHorizontal: Spacing.xs` (8px) which is not enough for long tier names like "FOUNDATION" when the card is in a 2-column grid.
**Why it matters**: Tier labels are the primary badge differentiator. "FOUNDATI..." tells the user nothing.
**Fix**:
- In `components/badges/badge-card.tsx`, reduce the `tierText` style (line 185) from `Typography.caption` to `Typography.micro` -- this is already uppercase and smaller, so it fits better.
- Change `letterSpacing` from `0.5` to `0.3` to save horizontal space.
- Add `numberOfLines={1}` to the tier pill ThemedText (line 82).
- In `components/badges/badge-grid.tsx` line 37, the `cardWidth` calculation subtracts `Spacing.lg * 2` which is 64px. This may be too aggressive. Review and reduce to `Spacing.md * 2` (48px) if the cards are too narrow.
- Alternative: in `badge-card.tsx`, consider abbreviating long tier names in a helper (e.g. "FOUNDATION" -> "FOUND." if width is constrained), but `numberOfLines={1}` with ellipsis is simpler and acceptable.

**Verify**: Badges screen should show tier labels fully or with clean ellipsis, never mid-character truncation. "BRONZE", "SILVER", "GOLD" should always fit. "FOUNDATION" may ellipsize to "FOUNDAT..." which is acceptable.

---

### 1.4 Notifications: empty white rectangle between filter bar and content

**File**: `components/notification/notifications-panel.tsx`
**What's broken**: When the notification list is empty or between the filter bar and content area, there appears to be a large white rectangle. This is likely the `emptyState` View at line 181-191 with `paddingTop: 60` creating a large gap, combined with the ScrollView `contentContainerStyle` having `paddingTop: Spacing.xs` (8px). If no notifications exist but the empty state isn't rendered (e.g., during a loading-to-empty transition), there may be a blank View.
**Also check**: `components/notification/notification-filter-bar.tsx` -- the `segmentGroup` style has `backgroundColor: withAlpha(palette.surface, 0.9)` and `borderWidth: 1` which could create a visible white block.
**Why it matters**: Large empty white rectangle looks like a rendering bug. Users think the app is broken.
**Fix**:
- In `components/notification/notifications-panel.tsx`, reduce the `emptyState` style `paddingTop` from `60` to `Spacing['2xl']` (48px).
- Ensure the empty state View uses `flex: 1` and `justifyContent: 'center'` instead of relying on a fixed paddingTop.
- Check that the ScrollView's `contentContainerStyle` includes `flexGrow: 1` so the empty state centers properly.
- In `notification-filter-bar.tsx`, the filter bar wrapper may have excessive bottom padding. Check `paddingBottom: Spacing.xxs` in `filterBar` style -- this is fine (4px), but verify the `segmentGroup` border isn't creating visual noise.

**Verify**: Open Notifications with no notifications. The "No notifications" empty state should be vertically centered in the available space below the filter bar, with no mysterious white rectangle.

---

### 1.5 Wallet: duplicate "Top Up" buttons

**File**: `app/(tabs)/wallet.tsx`, `components/wallet/wallet-balance-card.tsx`, `components/wallet/wallet-quick-actions.tsx`
**What's broken**: The wallet screen renders both `WalletBalanceCard` (which has its own "Top Up" button at line 51-58) AND `WalletQuickActions` (which has another "Top Up" button at line 34-41). Both call the same `openTopUpModal` handler. The user sees two "Top Up" buttons stacked vertically.
**Why it matters**: Duplicate CTAs look sloppy and confuse the user about which to tap.
**Fix**:
- **Remove the "Top Up" button from `WalletBalanceCard`** (`components/wallet/wallet-balance-card.tsx`). Delete lines 51-58 (the Clickable wrapping the Top Up button). Remove the `onTopUp` prop from the component interface. The balance card should just show the balance -- clean, calm, no CTA screaming at you.
- Update `app/(tabs)/wallet.tsx` line 79 to remove the `onTopUp={openTopUpModal}` prop from `WalletBalanceCard`.
- The `WalletQuickActions` component at line 80 keeps its "Top Up" and "History" buttons -- these are the appropriate, subtle action buttons.
- Also remove the `topUpButton` and `topUpText` styles from the balance card StyleSheet.

**Verify**: Wallet screen should show the balance card (just balance + pending), then the quick actions row (Top Up | History), then transactions. Only one "Top Up" action visible.

---

### 1.6 Currency inconsistency

**Files**: `utils/format.ts`, `services/wallet/wallet-utils-service.ts`
**What's broken**: `utils/format.ts` line 47 exports `formatGBP` which formats as `£`, but some services (like wallet) use their own `formatAmount` method. The wallet service may format with `$` or a different symbol. Screenshots show inconsistent `$` vs `£` across the app.
**Why it matters**: This is a UK app (£20/month subscription). Mixed currency symbols destroy trust.
**Fix**:
- In `utils/format.ts`, verify `formatGBP` always uses `£`. This is correct.
- Search for any `formatAmount` in `services/wallet/wallet-utils-service.ts` and ensure it uses `£` not `$`.
- Grep for `\$` in any display component and replace with `£` or `formatGBP()`.
- Grep for `USD` and replace with `GBP`.
- The goal: every monetary value in the app uses `formatGBP()` from `utils/format.ts` or manually shows `£`.
- Check `components/payment/card-form.tsx` which was flagged as containing `$`.

**Verify**: Every screen showing money (Wallet, Earnings, Packages, Session Pricing) should show `£` consistently.

---

## Part 2: Card Density Compression

### Design Goal
Cards currently consume 120-250px of vertical height for 2 lines of text. Target: 25-30% padding reduction. Cards should feel tight and information-dense like Linear cards, not padded like a beginner Bootstrap site.

### 2.1 SurfaceCard default padding (global impact)

**File**: `components/primitives/surface-card-styles.ts`
**What's broken**: SurfaceCard is used 266+ times across the app. Its default padding sets the density baseline for every card. If the default is too generous, every screen feels padded.
**Fix**:
- Read `components/primitives/surface-card-styles.ts` and find the default card padding.
- The `Components.card.padding` is `Spacing.sm` (16px). This is actually reasonable for a card container.
- The problem is that INDIVIDUAL card components (like `athlete-row.tsx`, `badge-card.tsx`, `session-offering-card.tsx`) add their own padding ON TOP of SurfaceCard's padding.
- Do NOT change SurfaceCard's default. Instead, fix the individual card components below.

---

### 2.2 Athlete row card density

**File**: `components/roster/athlete-row.tsx`
**What's broken**: Card padding is `Spacing.md` (24px) at line 182. Avatar is 48px. Total vertical height is ~140px+ for a name, parent name, and session count.
**Fix**:
- Reduce card padding from `Spacing.md` to `Spacing.sm` (16px): line 182.
- Reduce avatar size from 48px to 40px: lines 185-186.
- Reduce avatar font from `Typography.subheading` to `Typography.bodySmall`: line 191.
- Reduce outer Row gap from `gap="md"` to `gap="sm"`: line 69.
- Reduce the `tagsSection` marginTop and paddingTop from `Spacing.sm` (16px) to `Spacing.xs` (8px): lines 216-217.
- Target: card height ~100px without tags, ~120px with tags.

---

### 2.3 Athlete detail card density

**File**: `components/roster/athlete-card.tsx`
**What's broken**: Similar over-padding to athlete-row. Uses SurfaceCard with generous padding.
**Fix**:
- Read the full file to find card styles and reduce padding by ~25%.
- Apply same avatar size reduction (48px -> 40px) if applicable.
- Tighten gaps between info rows.

---

### 2.4 Analytics stat cards

**File**: `components/coach/analytics-screen-sections.tsx`
**What's broken**: The stat card has `padding: Spacing.lg` (32px) at line 168. The icon container is 48px with `marginBottom: Spacing.xs` (8px). Total card height is ~200px for just a number and label.
**Fix**:
- Reduce `statCard` padding from `Spacing.lg` to `Spacing.md` (24px): line 168.
- Reduce `statCard` gap from `Spacing.sm` to `Spacing.xs`: line 168.
- Reduce stat icon size from 48px to 40px: lines 170-171.
- Remove or reduce `marginBottom: Spacing.xs` on the icon: line 176.
- Reduce `statsGrid` gap from `Spacing.md` to `Spacing.sm`: line 161.
- Target: ~30% shorter stat cards.

---

### 2.5 Earnings balance card density

**File**: `components/earnings/earnings-balance-card.tsx`
**What's broken**: Card padding is `Spacing.lg` (32px) with `gap: Spacing.md` (24px) at line 87. The icon is 48px. The withdraw button has `minHeight: 52` and `marginTop: Spacing.xs`. Total height is ~300px+.
**Fix**:
- Reduce card padding from `Spacing.lg` to `Spacing.md` (24px): line 87.
- Reduce card gap from `Spacing.md` to `Spacing.sm` (16px): line 87.
- Reduce icon size from 48px to 40px: lines 90-91.
- Reduce withdraw button `minHeight` from `52` to `44` (standard button height): line 107.
- Reduce details gap from `Spacing.sm` to `Spacing.xs`: line 99.
- Target: ~250px total height.

---

### 2.6 Wallet balance card density

**File**: `components/wallet/wallet-balance-card.tsx`
**What's broken**: Card padding is `Spacing.lg` (32px) at line 68. After removing the duplicate Top Up button (fix 1.5), the card will be smaller, but still padded.
**Fix**:
- Reduce card padding from `Spacing.lg` to `Spacing.md` (24px): line 68.
- After removing the Top Up button (fix 1.5), the card should be ~120px -- just balance + pending.

---

### 2.7 Wallet quick actions density

**File**: `components/wallet/wallet-quick-actions.tsx`
**What's broken**: Button padding is `Spacing.md` (24px vertical) at line 64. With `minHeight: 44`, the buttons are ~68px tall.
**Fix**:
- Reduce button `paddingVertical` from `Spacing.md` to `Spacing.sm` (16px): line 64.
- This brings button height to ~52px which is comfortable for touch targets.

---

### 2.8 Session offering card density

**File**: `components/sessions/session-offering-card.tsx`
**Also**: `components/discover/session-offering-card.tsx`
**What's broken**: Session cards in Discover Sessions and similar screens are tall and padded.
**Fix**:
- Read both files and reduce internal padding/gaps by ~25%.
- Reduce any `Spacing.lg` padding to `Spacing.md`, and `Spacing.md` gaps to `Spacing.sm`.

---

### 2.9 Settings row density

**File**: `components/settings/settings-row.tsx`
**What's broken**: The `settingRow` style has `padding: Spacing.sm` (16px) and `minHeight: 56`. The icon container is 40px. This is actually reasonable, but the icon container's 40px is slightly large.
**Fix**:
- Reduce icon container from 40px to 36px: lines 162-163.
- Reduce `minHeight` from 56 to 52: line 159.
- This is a subtle change but compounds across Settings screens with 8+ rows.

---

### 2.10 Badge card density

**File**: `components/badges/badge-card.tsx`
**What's broken**: Card has `padding: Spacing.sm` (16px) and `minHeight: 160` at line 158. The icon container is 52px. In a 2-column grid, cards are tall relative to content.
**Fix**:
- Reduce `minHeight` from 160 to 140: line 158.
- Reduce icon container from 52px to 44px: lines 166-167.
- Reduce icon size inside from 28 to 24: line 60.
- These are 2-column grid cards so they need to be compact.

---

## Order of Operations

1. **Bug fixes 1.1-1.6** (do ALL bugs first, they're user-visible breakage)
2. **Card density 2.2-2.3** (athlete cards -- most commonly viewed)
3. **Card density 2.5-2.6-2.7** (wallet/earnings -- the money screens)
4. **Card density 2.4** (analytics stat cards)
5. **Card density 2.8** (session cards)
6. **Card density 2.9-2.10** (settings rows, badge cards)

---

## Quality Gate

- [ ] Settings > Account: Email label renders horizontally, never vertically
- [ ] Athletes tab: Names show 10+ characters before ellipsis, not 3-4
- [ ] Badges: Tier labels show fully or clean ellipsis, never mid-char truncation
- [ ] Notifications: No white rectangle artifact when list is empty
- [ ] Wallet: Only ONE "Top Up" action visible (in quick actions row, not balance card)
- [ ] All monetary values show `£` not `$`
- [ ] Card heights reduced ~25% across touched components
- [ ] No card feels cramped or unreadable after density changes
- [ ] All touch targets remain >= 44px (check minHeight on interactive elements)
- [ ] TypeScript compiles: `npx tsc -p tsconfig.test.json`

---

## Files Touched (complete list)

| File | Action |
|------|--------|
| `components/settings/settings-row.tsx` | Fix email vertical label + density |
| `components/roster/athlete-row.tsx` | Fix name truncation + density |
| `components/roster/athlete-card.tsx` | Fix name truncation + density |
| `components/badges/badge-card.tsx` | Fix tier label truncation + density |
| `components/badges/badge-grid.tsx` | Review cardWidth calculation |
| `components/notification/notifications-panel.tsx` | Fix empty white rectangle |
| `components/notification/notification-filter-bar.tsx` | Check filter bar spacing |
| `components/wallet/wallet-balance-card.tsx` | Remove duplicate Top Up + density |
| `components/wallet/wallet-quick-actions.tsx` | Density |
| `app/(tabs)/wallet.tsx` | Remove onTopUp prop from BalanceCard |
| `utils/format.ts` | Verify GBP formatting |
| `services/wallet/wallet-utils-service.ts` | Fix currency symbol |
| `components/payment/card-form.tsx` | Fix $ to £ |
| `components/coach/analytics-screen-sections.tsx` | Density |
| `components/earnings/earnings-balance-card.tsx` | Density |
| `components/sessions/session-offering-card.tsx` | Density |
| `components/discover/session-offering-card.tsx` | Density |
| `components/athlete/athletes-screen-header-sections.tsx` | Check card width |

# Sprint 5: Accessibility & Component Polish

**Duration**: 3-4 days
**Goal**: Close remaining UX gaps, accessibility, and component cleanup

---

## 5.1 Missing Accessibility Labels (~10 screens)

Add `accessibilityLabel`, `accessibilityRole`, and `accessibilityState` to interactive elements:

- [ ] `app/settings/account.tsx` — form inputs and buttons
- [ ] `app/matches/index.tsx` — filter tabs and match cards
- [ ] `app/development/badges.tsx` — tab buttons
- [ ] `components/session/video-recorder-overlay.tsx` — camera controls
- [ ] `components/family/child-switcher.tsx` — child toggle
- [ ] `components/coach/session-type-chips.tsx` — chip selection
- [ ] `components/social/comment-card.tsx` — interactive elements
- [ ] `components/social/comment-input.tsx` — input field
- [ ] Generic chevron/close icons across nav headers — add labels

---

## 5.2 useScreen() Adoption (4 screens)

Convert remaining screens to use `useScreen()` pattern:

- [ ] `app/settings/account.tsx` — add useScreen wrapper with loading/error/empty states
- [ ] `app/(tabs)/bookings/session-feedback.tsx` — replace useEffect-based loading with useScreen
- [ ] Audit `app/bookings/[id]/counter.tsx` — verify useCounterOffer follows the state machine pattern
- [ ] Audit `app/coach-profile.tsx` — verify useCoachProfile follows the state machine pattern

---

## 5.3 FlatList Memoization Gaps

Verify and fix renderItem memoization in:

- [ ] `components/bookings/discover-sections.tsx`
- [ ] `components/schedule/schedule-session-item.tsx`
- [ ] `components/messaging/conversation-row.tsx`
- [ ] `components/wallet/wallet-transaction-item.tsx`
- [ ] `components/review/coach-select-list.tsx`
- [ ] `components/recurring/RecurringList.tsx`
- [ ] `components/messaging/group-conversation-row.tsx`
- [ ] `components/invoices/InvoiceList.tsx`
- [ ] `components/goals/GoalList.tsx`
- [ ] `components/favourites/FavouritesList.tsx`

Pattern: Ensure list item component is wrapped in `memo()` and renderItem uses `useCallback`.

---

## 5.4 Inline Handler → useCallback (5-8 screens)

Convert inline arrow functions to useCallback where they're passed as props:

- [ ] `app/development/athlete/[athleteId]/index.tsx` — inline handlers
- [ ] `app/matches/index.tsx` — renderItem inline
- [ ] Spot-check other screens with `() =>` in JSX that pass to child components

---

## 5.5 Large Component Splits (optional, time permitting)

Consider splitting these 350+ line components into sub-components:

- [ ] `components/progress/position-pentagon.tsx` (500+ lines)
- [ ] `components/progress/player-card-front.tsx` (420+ lines)
- [ ] `components/progress/four-corner-diamond.tsx` (400+ lines)
- [ ] `components/progress/coach-says-card.tsx` (400+ lines)
- [ ] `components/discover/map-content.native.tsx` (400+ lines)
- [ ] `components/discover/map-content.web.tsx` (400+ lines)

**Note**: The 250-line limit was removed from CLAUDE.md. Only split if it improves readability.

---

## 5.6 Hardcoded Line Heights (20 violations)

Replace with Typography-derived values or define new tokens:

- [ ] `components/progress/coach-says-card.tsx:546,563,600` — lineHeight: 34, 22, 18
- [ ] `components/progress/player-card-front.tsx` (2x) — lineHeight: 36, 30
- [ ] `components/progress/monthly-story.tsx` — lineHeight: 22
- [ ] `components/ui/notification-bell.tsx` — lineHeight: 11
- [ ] `components/ui/empty-state.tsx` — lineHeight: 20
- [ ] `components/error-boundary.tsx` — lineHeight: 24
- [ ] 8 more progress components — lineHeight: 18, 20, 22, 24

**Approach**: Add `lineHeight` to Typography token objects in `constants/theme.ts`:
```typescript
Typography = {
  body: { fontSize: 15, lineHeight: 22 },
  bodySmall: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 18 },
  // etc.
}
```

---

## Definition of Done
- [ ] All interactive elements have accessibilityLabel
- [ ] All screens follow useScreen() or equivalent state machine pattern
- [ ] All FlatList renderItem components wrapped in memo()
- [ ] All handler props use useCallback
- [ ] Line heights use Typography tokens
- [ ] Visual spot-check passes on 10 key screens

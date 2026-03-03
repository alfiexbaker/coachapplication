# Results Program UI Sprint 3: Coach Command Centre + Intervention Workflows

**Sprint Goal**: Make coach mode feel like an operational command centre that drives intervention speed and client outcomes.

**Non-overlap rule**: This is not a coach analytics dashboard. It is a queue + action console for immediate follow-up.

**Items**: 6 (RPU-301, RPU-302, RPU-303, RPU-304, RPU-305, RPU-306)

---

## Item RPU-301: Rebuild Coach Mode into a Triage Console

**Problem**: Coach mode currently looks like a card list, not a high-performance queue.

**Files**:
- `app/development/progress-loop.tsx`
- `components/progress-loop/coach-queue-card.tsx`

**Prompt**:
```tsx
Rework coach mode into a triage console with explicit urgency lanes.

Layout:
- KPI strip (Athletes at risk, Overdue tasks, Due soon today)
- Segmented queue lanes:
  - Intervene now
  - Watch today
  - Stable

Requirements:
- Lane assignment based on existing risk + due counts
- Sticky lane selector while scrolling
- Show lane counts live

Acceptance criteria:
✓ Coach can triage queue in <5 seconds
✓ Highest-risk lane is default selected
✓ Lane counts update when tasks are completed/rescheduled
```

---

## Item RPU-302: Athlete Risk Cards with Trend Signal

**Problem**: Current cards do not show recent trajectory clearly.

**Files**:
- `components/progress-loop/coach-queue-card.tsx`
- Optional reuse: `components/progress/sparkline.tsx`

**Libraries**:
- `react-native-svg` (already available)

**Prompt**:
```tsx
Upgrade each coach athlete card with a compact trend signal.

Card structure:
- Athlete identity + risk badge
- Pending/overdue/due-soon counts
- Next due countdown
- Confidence/mood mini trend sparkline (last snapshots)
- Recommended action copy (1 line max)

Rules:
- Reuse existing Sparkline component where possible
- Keep card dense but readable on small screens
- Truncate long text with explicit max lines

Acceptance criteria:
✓ Coach can understand who is worsening at a glance
✓ Trend signal uses real recent values, not placeholder data
✓ Card stays performant in long lists
```

---

## Item RPU-303: Bulk Actions for Queue Throughput

**Problem**: Coaches must open each athlete individually for repetitive actions.

**Files**:
- `app/development/progress-loop.tsx`
- `hooks/use-progress-loop.ts`
- Service updates as needed in `services/progress/progress-practice-task-service.ts`

**Prompt**:
```tsx
Add safe bulk actions in coach mode.

Bulk actions:
- Nudge all overdue athletes
- Nudge due-soon athletes
- Mark all selected tasks reviewed (coach-only state if required)

Requirements:
- Multi-select mode with clear selected count
- Confirm dialog before bulk send actions
- Action result summary toast (success/partial/fail)

Acceptance criteria:
✓ Bulk actions reduce repetitive taps
✓ Errors are surfaced per-action summary
✓ No accidental bulk action without confirmation
```

---

## Item RPU-304: Intervention Playbook Bottom Sheet

**Problem**: Recommended action text is static and not operational.

**Files**:
- `components/progress-loop/coach-queue-card.tsx`
- New: `components/progress-loop/intervention-playbook-sheet.tsx`

**Library**:
- `@gorhom/bottom-sheet`

**Prompt**:
```tsx
Create an intervention playbook sheet for each athlete row.

When opening playbook:
- Show why athlete is flagged (overdue, low confidence, etc.)
- Provide 3 tactical actions:
  1. Send message
  2. Set 48h recovery checkpoint (reschedule due date)
  3. Open session history

Rules:
- Keep copy concrete and short
- Each action must be wired (no placeholder buttons)
- Track action taps via analytics events (existing event bus)

Acceptance criteria:
✓ Playbook turns recommendation into executable actions
✓ Every listed action works immediately
✓ No dead-end controls
```

---

## Item RPU-305: Parent-Visible "Coach Following Up" Trust Signal

**Problem**: Parents cannot easily see that coach intervention is actively happening.

**Files**:
- `app/development/progress-loop.tsx`
- `hooks/use-progress-loop.ts`

**Prompt**:
```tsx
Add a lightweight trust signal in parent mode.

Show a small status strip when tasks are pending/overdue:
- "Coach follow-up active" when recent coach action exists
- "Awaiting coach follow-up" when no recent action exists

Requirements:
- Use existing available data where possible
- If action timestamp isn't available yet, add minimal field support in service model
- Do not expose private coach notes

Acceptance criteria:
✓ Parent gets clear confidence signal without extra noise
✓ Signal is truthful and data-backed
✓ No leakage of coach-only details
```

---

## Item RPU-306: Queue Performance Hardening (Coach Lists)

**Problem**: As queue size grows, scrolling and updates can become janky.

**Files**:
- `app/development/progress-loop.tsx`
- `components/progress-loop/coach-queue-card.tsx`

**Prompt**:
```tsx
Optimize coach queue rendering for large rosters.

1. Move queue list rendering to virtualized list:
   - Prefer FlatList now
   - Optional: adopt @shopify/flash-list if team approves dependency

2. Performance rules:
   - memoized row components
   - stable keyExtractor
   - getItemLayout when fixed height is feasible
   - avoid inline closures in renderItem

3. Keep animated entry effects lightweight and virtualization-safe.

Acceptance criteria:
✓ Smooth scroll on 100+ queue rows
✓ No dropped frames during filter/lane switches
✓ Typecheck and existing tests remain green
```

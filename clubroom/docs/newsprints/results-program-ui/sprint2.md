# Results Program UI Sprint 2: Action Engine + Frictionless Execution

**Sprint Goal**: Turn the screen into a fast execution engine. Every task should support decisive action (complete, reschedule, message) in 1-2 taps.

**Non-overlap rule**: This sprint is about action throughput and operational control, not deeper historical analytics.

**Items**: 6 (RPU-201, RPU-202, RPU-203, RPU-204, RPU-205, RPU-206)

---

## Item RPU-201: Task Detail Bottom Sheet (Single Action Hub)

**Problem**: Task cards expose only one action and force context switching.

**Files**:
- `components/progress-loop/task-card.tsx`
- `app/development/progress-loop.tsx`

**Library**:
- `@gorhom/bottom-sheet`

**Prompt**:
```tsx
Add a task-detail bottom sheet opened from each task card.

Sheet content:
- Task title + description
- Due date + timing status
- Coach/athlete context
- Primary action: Mark done / Mark not done
- Secondary actions: Reschedule, Message coach, Add completion note

Implementation rules:
- Use @gorhom/bottom-sheet with snap points (e.g. 45%, 80%).
- Keep swipe-to-close and backdrop behavior.
- Ensure keyboard handling works for note input.

Acceptance criteria:
✓ Tapping a task opens sheet smoothly
✓ All key actions are available without navigating away
✓ No layout break on iPhone SE
```

---

## Item RPU-202: Add Due-Date Mutation APIs (Reschedule/Snooze)

**Problem**: Users cannot recover from missed tasks without manual workaround.

**Files**:
- `services/progress/progress-practice-task-service.ts`
- `hooks/use-progress-loop.ts`

**Prompt**:
```ts
Add explicit due-date mutation support to progressPracticeTaskService.

New service methods:
- updateTaskDueAt(taskId: string, dueAtIso: string, actorId: string)
- snoozeTask(taskId: string, actorId: string, hours: number)

Requirements:
- Validate task id and dueAt
- Keep Result<T, ServiceError> pattern (no thrown exceptions)
- Update updatedAt and persist via saveTaskRecords
- Return updated PracticeTask view model

Hook updates:
- Expose action methods from useProgressLoop for UI layer
- Refresh data after successful mutation

Acceptance criteria:
✓ Tasks can be snoozed or rescheduled in-app
✓ Invalid inputs return VALIDATION errors
✓ UI refreshes immediately after mutation
```

---

## Item RPU-203: Relative Time Labels + Live Urgency

**Problem**: Absolute dates are too slow to parse during triage.

**Files**:
- `components/progress-loop/task-card.tsx`
- `app/development/progress-loop.tsx`

**Prompt**:
```tsx
Replace generic due labels with relative urgency labels.

Examples:
- "Overdue by 2d"
- "Due in 5h"
- "Due tomorrow, 18:30"

Requirements:
- Keep local timezone formatting
- Recompute labels over time (minute tick while screen is active)
- Visual hierarchy:
  - overdue -> error emphasis
  - due soon -> warning emphasis
  - upcoming -> muted/info emphasis

Acceptance criteria:
✓ User can triage urgency at a glance
✓ Labels remain accurate while screen stays open
✓ No raw ISO date strings shown
```

---

## Item RPU-204: Completion Animation + Undo Flow

**Problem**: Marking task done has weak feedback and no recovery path.

**Files**:
- `components/progress-loop/task-card.tsx`
- `app/development/progress-loop.tsx`
- `hooks/use-progress-loop.ts`

**Libraries**:
- `react-native-reanimated`
- `expo-haptics`

**Prompt**:
```tsx
Add a high-quality completion experience.

1. On "Mark as done":
   - Trigger success haptic
   - Animate card to completed state (or collapse when filtered out)
   - Show toast/banner with "Undo" action for ~6s

2. Undo behavior:
   - Revert completion state via existing mutation
   - Restore card in-place with animation

3. Failure behavior:
   - If mutation fails, rollback optimistic state
   - Show error toast with clear next step

Acceptance criteria:
✓ Completion feels instant and trustworthy
✓ Undo works reliably
✓ No duplicate submits while mutation in-flight
```

---

## Item RPU-205: One-Tap Message Context from Task

**Problem**: The user cannot quickly request help with task context.

**Files**:
- `components/progress-loop/task-card.tsx`
- `app/development/progress-loop.tsx`
- `navigation/routes.ts` (if helper expansion needed)

**Prompt**:
```tsx
Add "Message" action from each task that opens conversation context.

Behavior:
- Parent/Athlete task -> open messages with the task's coach
- Coach queue row -> open chat with athlete (existing helper)

Message context:
- Include task context in navigation params if supported
- If not supported yet, navigate to the correct thread landing and show toast with context copied summary

Acceptance criteria:
✓ User reaches the right conversation in one tap
✓ No dead-end action for missing coach/athlete context
✓ Accessibility labels include target name
```

---

## Item RPU-206: Task Grouping for Faster Throughput

**Problem**: Flat lists slow down execution when task counts increase.

**Files**:
- `hooks/use-progress-loop.ts`
- `app/development/progress-loop.tsx`

**Prompt**:
```tsx
Add grouped rendering in Results Program list mode.

Grouping order:
1. Overdue
2. Due soon
3. Upcoming
4. Completed

Requirements:
- Keep current filter support
- Within each group, sort by dueAt asc
- Add compact section headers with counts
- Collapse completed section by default

Acceptance criteria:
✓ Users can scan and act on highest urgency first
✓ Completed tasks do not dominate screen real estate
✓ Group counts and ordering stay correct after mutations
```

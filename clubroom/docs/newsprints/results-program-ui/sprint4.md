# Results Program UI Sprint 4: Production Polish, Reliability, and Launch Readiness

**Sprint Goal**: Bring Results Program to launch-grade quality with performance, accessibility, reliability, and measurable outcomes.

**Non-overlap rule**: Preserve Results Program as execution tooling. Do not add redundant analytics modules already owned by `My Progress`.

**Items**: 6 (RPU-401, RPU-402, RPU-403, RPU-404, RPU-405, RPU-406)

---

## Item RPU-401: Visual QA Pass Across Device Sizes and Themes

**Problem**: Premium UI must survive small screens and theme variations without manual patching.

**Files**:
- `app/development/progress-loop.tsx`
- `components/progress-loop/*`

**Prompt**:
```tsx
Run and fix visual QA for Results Program across target contexts.

Targets:
- iPhone SE (small width)
- Standard iPhone size
- Light + dark theme
- Coach + Parent + Athlete modes

Fixes expected:
- Text clipping
- Button wrapping
- Sticky filter overlap
- Card density/spacing inconsistencies

Acceptance criteria:
✓ No clipped or overlapping UI in target contexts
✓ Visual hierarchy remains clear on smallest supported device
✓ Theme contrast remains readable
```

---

## Item RPU-402: Accessibility Upgrade to Premium Standard

**Problem**: Execution UI needs excellent accessibility because it is high-frequency usage.

**Files**:
- `app/development/progress-loop.tsx`
- `components/progress-loop/*`

**Prompt**:
```tsx
Implement full accessibility pass for Results Program.

Requirements:
- Proper roles/states for segmented controls and task actions
- Accessible labels that include action + target
- Logical focus order (hero -> filter -> list)
- Announce completion/reschedule success via live region or toast semantics
- Ensure 44px hit targets everywhere

Acceptance criteria:
✓ VoiceOver/TalkBack can complete key flows end-to-end
✓ No unlabeled actionable controls
✓ Dynamic type does not break layout
```

---

## Item RPU-403: Optimistic Updates + Offline Resilience

**Problem**: Fast action UI must still be trustworthy under flaky network/storage conditions.

**Files**:
- `hooks/use-progress-loop.ts`
- `services/progress/progress-practice-task-service.ts`
- `app/development/progress-loop.tsx`

**Prompt**:
```ts
Harden mutations with optimistic UI + safe rollback.

1. For complete/reschedule/snooze:
   - Apply optimistic UI update immediately
   - Roll back on failure
   - Surface clear error toast

2. If mutation cannot sync immediately:
   - Queue retry using existing offline/event patterns where applicable
   - Mark task row as "syncing" until confirmed

3. Avoid duplicate submissions while in-flight.

Acceptance criteria:
✓ UI feels instant on success path
✓ Failures do not leave stale or misleading state
✓ Retries are visible and controlled
```

---

## Item RPU-404: Instrumentation and Product Metrics

**Problem**: Without instrumentation, we cannot prove this feature creates value.

**Files**:
- `app/development/progress-loop.tsx`
- `hooks/use-progress-loop.ts`
- analytics/event files as needed

**Prompt**:
```ts
Add event instrumentation for Results Program outcomes.

Track at minimum:
- results_program_opened
- results_program_filter_changed
- results_program_task_completed
- results_program_task_rescheduled
- results_program_message_from_task
- results_program_bulk_nudge_sent

Metrics definitions:
- Time to first action (open -> first mutation)
- Daily task completion rate
- Overdue resolution within 48h

Acceptance criteria:
✓ Events fire once per intended action
✓ Payloads include role and relevant IDs (no sensitive text)
✓ Product team can compute success metrics from emitted events
```

---

## Item RPU-405: Test Coverage for Critical Flows

**Problem**: Fast-moving UI changes risk regressions without targeted tests.

**Files**:
- Add/update tests in `__tests__/` for hooks/components/services touched

**Prompt**:
```ts
Add targeted tests for Results Program critical behavior.

Minimum coverage:
- Service: set completion + reschedule/snooze validation paths
- Hook: filter/grouping logic and optimistic rollback
- UI: task action callbacks fire expected mutations

Rules:
- Use deterministic fixtures
- Avoid brittle snapshot-only testing for dynamic content

Acceptance criteria:
✓ New tests cover highest-risk execution paths
✓ `npx tsc -p tsconfig.test.json` passes
✓ Related test suites pass locally
```

---

## Item RPU-406: Home Entry Tile Upgrade with Real Status Preview

**Problem**: Home quick action currently looks generic and gives no reason to tap.

**Files**:
- `components/user/home-screen-sections.tsx`
- Optional hook wiring in home screen data source

**Prompt**:
```tsx
Upgrade the home quick action for Results Program with status preview.

Enhancements:
- Add small badge on tile: overdue count (if >0)
- Subtitle or micro-label: "2 urgent now" / "All clear"
- Distinct icon treatment for urgent state

Rules:
- Keep quick actions visually balanced (no oversized tile)
- Use theme tokens only
- Ensure tile remains accessible and tappable

Acceptance criteria:
✓ Home entry communicates immediate value before tap
✓ Urgent state is visually clear but not alarmist
✓ No layout regressions in quick action grid
```

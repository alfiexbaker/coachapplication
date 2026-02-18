# Sprint 2: The Core Chain

**Goal**: Coach completes session → real feedback appears on athlete profile → real skill ratings update → real earnings recorded → parent can leave review. The whole story works end-to-end.
**Size**: M (8-10 files)
**Priority**: P1 — this IS the demo

---

## Context

The session completion wizard (Steps: Attendance → Notes → Badges → Review) works mechanically — data is saved. But it's saved to the WRONG places, and downstream consumers read from DIFFERENT places. The chain is severed at 4 points.

---

## Tasks

### 2.1 Write SESSION_FEEDBACK during completion
**File**: `hooks/use-session-completion.ts` (around line 525)
**Problem**: Coach notes go to `SESSION_NOTES` via `progressService.saveSessionNote()`. But the athlete progress page reads `SESSION_FEEDBACK` via `progressFeedbackService`. These are different storage keys.
**Fix**: After `saveSessionNote()`, also call `progressFeedbackService.addSessionFeedback()` with:
- `sessionId`, `bookingId`, `coachId`, `athleteId`
- `publicSummary` from session notes
- `skillRatings` from the form (currently discarded!)
- `effortRating`, `overallPerformance`
- `visibility` based on `shareNotesWithParents` toggle

Do this for each PRESENT athlete in the attendance list.

### 2.2 Pipe skill ratings to SKILL_LEVELS
**File**: `hooks/use-session-completion.ts`
**Problem**: The completion form captures effort/focus but individual skill ratings from `addSessionFeedback()` should flow into `progressSkillsService.updateMultipleSkillLevels()`.
**Fix**: Inside the `addSessionFeedback()` call or immediately after, call:
```typescript
await progressSkillsService.updateMultipleSkillLevels(athleteId, coachId, skillRatings);
```
Where `skillRatings` maps `skillsFocused[]` to the effort/performance ratings from the form.

### 2.3 Reliable booking status → COMPLETED
**File**: `hooks/use-session-completion.ts` (around line 584-627)
**Problem**: Booking status update is fragile — works for `sourceType === 'booking'` but silently fails on mismatched IDs.
**Fix**:
- Add explicit error handling: if `bookingService.updateBooking()` fails, log and retry once
- After update, verify the booking status actually changed (read back)
- This unblocks parent reviews (which require `COMPLETED` status)

### 2.4 Await earnings recording + error handling
**File**: `services/service-subscribers.ts` (line 271)
**Problem**: `earningsReportService.recordSessionPayment()` is fire-and-forget (no `await`, no `try/catch`)
**Fix**:
```typescript
try {
  const result = await earningsReportService.recordSessionPayment(
    coachId, bookingId, price, athleteName, sessionDate
  );
  if (!result.success) {
    logger.error('Earnings recording failed', result.error);
  }
} catch (err) {
  logger.error('Earnings recording threw', err);
}
```

### 2.5 Emit events for attendance + notes
**Files**: `hooks/use-session-completion.ts`, `services/event-bus.ts`
**Problem**: Attendance and notes are written via direct `apiClient.set()` — no events emitted, so screens don't refresh.
**Fix**: After saving attendance and notes, emit:
```typescript
emitTyped(ServiceEvents.ATTENDANCE_RECORDED, { sessionId, bookingId, athleteIds });
emitTyped(ServiceEvents.SESSION_NOTES_SAVED, { sessionId, bookingId });
```
Add these two events to `event-bus.ts` if not already defined.

### 2.6 Analytics → read real data
**Files**:
- `services/analytics/analytics-query-service.ts` (line 258-259)
- `services/analytics/analytics-export-service.ts` (line 369)

**Problem**: Both files have hardcoded mock caches (`MOCK_ANALYTICS`, `MOCK_COACH_ANALYTICS`) that are NEVER updated from real data.

**Fix for athlete analytics**:
```typescript
async getAthleteAnalytics(athleteId: string) {
  const feedback = await apiClient.get(STORAGE_KEYS.SESSION_FEEDBACK, []);
  const skillLevels = await apiClient.get(STORAGE_KEYS.SKILL_LEVELS, {});
  const goals = await apiClient.get(STORAGE_KEYS.GOALS, []);
  // Aggregate into AthleteAnalytics from real data
  // Fall back to empty state if no data yet
}
```

**Fix for coach analytics**:
```typescript
async getCoachAnalytics(coachId: string, period: string) {
  const transactions = await apiClient.get(STORAGE_KEYS.EARNING_TRANSACTIONS, []);
  const bookings = await apiClient.get(STORAGE_KEYS.BOOKINGS, []);
  const feedback = await apiClient.get(STORAGE_KEYS.SESSION_FEEDBACK, []);
  // Calculate real revenue trends, session counts, completion rates
  // Fall back to empty state if no data yet
}
```

Show EmptyState ("Complete your first session to see analytics") instead of fake charts when there's no real data.

---

## Acceptance Criteria
- [ ] Coach completes session → athlete's progress page shows REAL feedback (not seeded)
- [ ] Skill ratings from completion form appear in athlete's skill radar
- [ ] Booking status reliably transitions to COMPLETED after session completion
- [ ] Parent can leave a review after session is completed
- [ ] Coach earnings dashboard reflects the actual session price (not mock transactions)
- [ ] Analytics dashboard shows real data from completed sessions, or empty state if none
- [ ] Attendance and notes changes cause listening screens to refresh

---

## Demo Script (verify this works)
1. Log in as coach
2. Navigate to a pending session
3. Mark attendance (2 present, 1 absent)
4. Add session notes + rate effort 4/5
5. Award "Great Effort" badge to one athlete
6. Complete session
7. Switch to athlete account
8. Open progress → see the coach's feedback, skill rating, badge
9. Open skill radar → see updated ratings
10. Switch back to coach
11. Open earnings → see the session payment recorded
12. Open analytics → see real session data (or clean empty state)

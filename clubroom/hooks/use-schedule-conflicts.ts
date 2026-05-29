/**
 * useScheduleConflicts — Detects overlapping sessions across different children.
 *
 * Conflict = two events for DIFFERENT children, overlapping in time,
 * with DIFFERENT coaches (parent must be in two places at once).
 *
 * Same coach + overlapping time = NOT a conflict (parent drops both kids at same place).
 * Warnings only — never blocks booking or RSVP.
 *
 * Phase 5, Multi-Child Sprint.
 */

import { useState } from 'react';
import type {
  FamilyCalendarEvent,
  ScheduleConflict,
  ConflictsByEventId,
} from '@/constants/family-types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface UseScheduleConflictsInput {
  /** All events for the current date range */
  events: FamilyCalendarEvent[];
  /** From useChildContext().isMultiChild — disables detection for single-child parents */
  isMultiChild: boolean;
}

interface UseScheduleConflictsResult {
  /** All detected conflicts for the given events */
  conflicts: ScheduleConflict[];
  /** Quick boolean check */
  hasConflicts: boolean;
  /** O(1) lookup: get all conflicts involving a specific event ID */
  getConflictsForEvent: (eventId: string) => ScheduleConflict[];
  /** Map for direct access */
  conflictsByEventId: ConflictsByEventId;
  /** Set of date strings (YYYY-MM-DD) the user has dismissed */
  dismissedDates: ReadonlySet<string>;
  /** Dismiss conflicts for a given date string (YYYY-MM-DD) */
  dismissDay: (dateStr: string) => void;
  /** Whether the banner for a given date has been dismissed */
  isDayDismissed: (dateStr: string) => boolean;
}

// ─── Pure Algorithm (exported for testing) ──────────────────────────────────

/**
 * Detect schedule conflicts between events for different children.
 *
 * Pure function — no React hooks. Called by the hook's useMemo internally,
 * and exported so node:test can exercise it directly.
 */
export function detectScheduleConflicts(
  events: FamilyCalendarEvent[],
  isMultiChild: boolean,
): ScheduleConflict[] {
  if (!isMultiChild || events.length < 2) return [];

  // 1. Filter: only events with valid start+end, not cancelled, has childId
  const eligible = events.filter(
    (e) => e.start && e.end && e.status !== 'CANCELLED' && e.childId,
  );

  if (eligible.length < 2) return [];

  // 2. Sort by start time ascending
  const sorted = Array.from(eligible).toSorted(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );

  // 3. Sweep: compare each event against subsequent overlapping events
  const result: ScheduleConflict[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    const aEnd = new Date(a.end).getTime();

    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];
      const bStart = new Date(b.start).getTime();

      // If b starts at or after a ends → no overlap (sorted, so break)
      if (bStart >= aEnd) break;

      // Same child → not a conflict
      if (a.childId === b.childId) continue;

      // Same coach (both present) → NOT a conflict (same location, parent drops both)
      if (a.coachId && b.coachId && a.coachId === b.coachId) continue;

      // No coachId on either → compare locations as fallback
      if (
        (!a.coachId || !b.coachId) &&
        a.location &&
        b.location &&
        a.location === b.location
      ) {
        continue;
      }

      // CONFLICT: different children, different coaches/locations, overlapping time
      const overlapStart = Math.max(new Date(a.start).getTime(), bStart);
      const overlapEnd = Math.min(aEnd, new Date(b.end).getTime());
      const overlapMinutes = Math.round((overlapEnd - overlapStart) / 60000);

      result.push({ eventA: a, eventB: b, overlapMinutes });
    }
  }

  return result;
}

/**
 * Build a reverse-index from event ID → conflicts involving that event.
 * Pure function — exported for testing.
 */
export function buildConflictsByEventId(
  conflicts: ScheduleConflict[],
): ConflictsByEventId {
  const map = new Map<string, ScheduleConflict[]>();
  for (const conflict of conflicts) {
    const aList = map.get(conflict.eventA.id) ?? [];
    aList.push(conflict);
    map.set(conflict.eventA.id, aList);

    const bList = map.get(conflict.eventB.id) ?? [];
    bList.push(conflict);
    map.set(conflict.eventB.id, bList);
  }
  return map;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useScheduleConflicts({
  events,
  isMultiChild,
}: UseScheduleConflictsInput): UseScheduleConflictsResult {
  // Dismissal state — session-scoped (resets when user leaves screen).
  // Intentional: conflicts should re-surface on next visit.
  const [dismissedDates, setDismissedDates] = useState<Set<string>>(new Set());

  const dismissDay = (dateStr: string) => {
    setDismissedDates((prev) => {
      const next = new Set(prev);
      next.add(dateStr);
      return next;
    });
  };

  const isDayDismissed = (dateStr: string) => dismissedDates.has(dateStr);

  // Core detection — memoized, O(n log n) per invocation
  const conflicts = detectScheduleConflicts(events, isMultiChild);

  // Build reverse-index: eventId → ScheduleConflict[]
  const conflictsByEventId = buildConflictsByEventId(conflicts);

  const getConflictsForEvent = (eventId: string): ScheduleConflict[] => conflictsByEventId.get(eventId) ?? [];

  return {
    conflicts,
    hasConflicts: conflicts.length > 0,
    getConflictsForEvent,
    conflictsByEventId,
    dismissedDates,
    dismissDay,
    isDayDismissed,
  };
}

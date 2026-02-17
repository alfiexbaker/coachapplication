"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectScheduleConflicts = detectScheduleConflicts;
exports.buildConflictsByEventId = buildConflictsByEventId;
exports.useScheduleConflicts = useScheduleConflicts;
const react_1 = require("react");
// ─── Pure Algorithm (exported for testing) ──────────────────────────────────
/**
 * Detect schedule conflicts between events for different children.
 *
 * Pure function — no React hooks. Called by the hook's useMemo internally,
 * and exported so node:test can exercise it directly.
 */
function detectScheduleConflicts(events, isMultiChild) {
    if (!isMultiChild || events.length < 2)
        return [];
    // 1. Filter: only events with valid start+end, not cancelled, has childId
    const eligible = events.filter((e) => e.start && e.end && e.status !== 'CANCELLED' && e.childId);
    if (eligible.length < 2)
        return [];
    // 2. Sort by start time ascending
    const sorted = [...eligible].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    // 3. Sweep: compare each event against subsequent overlapping events
    const result = [];
    for (let i = 0; i < sorted.length; i++) {
        const a = sorted[i];
        const aEnd = new Date(a.end).getTime();
        for (let j = i + 1; j < sorted.length; j++) {
            const b = sorted[j];
            const bStart = new Date(b.start).getTime();
            // If b starts at or after a ends → no overlap (sorted, so break)
            if (bStart >= aEnd)
                break;
            // Same child → not a conflict
            if (a.childId === b.childId)
                continue;
            // Same coach (both present) → NOT a conflict (same location, parent drops both)
            if (a.coachId && b.coachId && a.coachId === b.coachId)
                continue;
            // No coachId on either → compare locations as fallback
            if ((!a.coachId || !b.coachId) &&
                a.location &&
                b.location &&
                a.location === b.location) {
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
function buildConflictsByEventId(conflicts) {
    const map = new Map();
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
function useScheduleConflicts({ events, isMultiChild, }) {
    // Dismissal state — session-scoped (resets when user leaves screen).
    // Intentional: conflicts should re-surface on next visit.
    const [dismissedDates, setDismissedDates] = (0, react_1.useState)(new Set());
    const dismissDay = (0, react_1.useCallback)((dateStr) => {
        setDismissedDates((prev) => {
            const next = new Set(prev);
            next.add(dateStr);
            return next;
        });
    }, []);
    const isDayDismissed = (0, react_1.useCallback)((dateStr) => dismissedDates.has(dateStr), [dismissedDates]);
    // Core detection — memoized, O(n log n) per invocation
    const conflicts = (0, react_1.useMemo)(() => detectScheduleConflicts(events, isMultiChild), [events, isMultiChild]);
    // Build reverse-index: eventId → ScheduleConflict[]
    const conflictsByEventId = (0, react_1.useMemo)(() => buildConflictsByEventId(conflicts), [conflicts]);
    const getConflictsForEvent = (0, react_1.useCallback)((eventId) => conflictsByEventId.get(eventId) ?? [], [conflictsByEventId]);
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

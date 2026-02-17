"use strict";
/**
 * Schedule Conflict Detection Tests
 *
 * Tests for detectScheduleConflicts() and buildConflictsByEventId() —
 * the pure algorithm behind useScheduleConflicts hook.
 *
 * Phase 5, Multi-Child Sprint.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importStar(require("node:test"));
const use_schedule_conflicts_1 = require("../../hooks/use-schedule-conflicts");
// ─── Helpers ────────────────────────────────────────────────────────────────
/** Build a minimal FamilyCalendarEvent for testing. */
function makeEvent(overrides) {
    return {
        title: 'Training',
        colorCode: '#FF0000',
        start: '2026-03-10T10:00:00Z',
        end: '2026-03-10T11:00:00Z',
        status: 'CONFIRMED',
        ...overrides,
    };
}
// ─── detectScheduleConflicts ────────────────────────────────────────────────
(0, node_test_1.describe)('detectScheduleConflicts', () => {
    (0, node_test_1.default)('empty events → no conflicts', () => {
        const result = (0, use_schedule_conflicts_1.detectScheduleConflicts)([], true);
        strict_1.default.deepStrictEqual(result, []);
    });
    (0, node_test_1.default)('single event → no conflicts', () => {
        const events = [makeEvent({ id: 'e1', childId: 'c1' })];
        const result = (0, use_schedule_conflicts_1.detectScheduleConflicts)(events, true);
        strict_1.default.deepStrictEqual(result, []);
    });
    (0, node_test_1.default)('isMultiChild=false → no conflicts regardless of events', () => {
        const events = [
            makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
            makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
        ];
        const result = (0, use_schedule_conflicts_1.detectScheduleConflicts)(events, false);
        strict_1.default.deepStrictEqual(result, []);
    });
    (0, node_test_1.default)('different children, different coaches, overlapping → CONFLICT', () => {
        const events = [
            makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
            makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
        ];
        const result = (0, use_schedule_conflicts_1.detectScheduleConflicts)(events, true);
        strict_1.default.strictEqual(result.length, 1);
        strict_1.default.strictEqual(result[0].eventA.id, 'e1');
        strict_1.default.strictEqual(result[0].eventB.id, 'e2');
    });
    (0, node_test_1.default)('different children, SAME coach, overlapping → NOT a conflict', () => {
        const events = [
            makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
            makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach1', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
        ];
        const result = (0, use_schedule_conflicts_1.detectScheduleConflicts)(events, true);
        strict_1.default.strictEqual(result.length, 0);
    });
    (0, node_test_1.default)('different children, different coaches, NOT overlapping → no conflict', () => {
        const events = [
            makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T09:00:00Z', end: '2026-03-10T10:00:00Z' }),
            makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T11:00:00Z', end: '2026-03-10T12:00:00Z' }),
        ];
        const result = (0, use_schedule_conflicts_1.detectScheduleConflicts)(events, true);
        strict_1.default.strictEqual(result.length, 0);
    });
    (0, node_test_1.default)('same child, overlapping → NOT a conflict', () => {
        const events = [
            makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
            makeEvent({ id: 'e2', childId: 'c1', coachId: 'coach2', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
        ];
        const result = (0, use_schedule_conflicts_1.detectScheduleConflicts)(events, true);
        strict_1.default.strictEqual(result.length, 0);
    });
    (0, node_test_1.default)('adjacent events (end of A = start of B) → NOT a conflict', () => {
        const events = [
            makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
            makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T11:00:00Z', end: '2026-03-10T12:00:00Z' }),
        ];
        const result = (0, use_schedule_conflicts_1.detectScheduleConflicts)(events, true);
        strict_1.default.strictEqual(result.length, 0);
    });
    (0, node_test_1.default)('cancelled event → excluded from conflict detection', () => {
        const events = [
            makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
            makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z', status: 'CANCELLED' }),
        ];
        const result = (0, use_schedule_conflicts_1.detectScheduleConflicts)(events, true);
        strict_1.default.strictEqual(result.length, 0);
    });
    (0, node_test_1.default)('event without start time → excluded', () => {
        const events = [
            makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
            makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '', end: '2026-03-10T11:30:00Z' }),
        ];
        const result = (0, use_schedule_conflicts_1.detectScheduleConflicts)(events, true);
        strict_1.default.strictEqual(result.length, 0);
    });
    (0, node_test_1.default)('event without end time → excluded', () => {
        const events = [
            makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
            makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T10:30:00Z', end: '' }),
        ];
        const result = (0, use_schedule_conflicts_1.detectScheduleConflicts)(events, true);
        strict_1.default.strictEqual(result.length, 0);
    });
    (0, node_test_1.default)('three events, two overlap → correct pair detected', () => {
        const events = [
            makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T09:00:00Z', end: '2026-03-10T10:00:00Z' }),
            makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T09:30:00Z', end: '2026-03-10T10:30:00Z' }),
            makeEvent({ id: 'e3', childId: 'c3', coachId: 'coach3', start: '2026-03-10T12:00:00Z', end: '2026-03-10T13:00:00Z' }),
        ];
        const result = (0, use_schedule_conflicts_1.detectScheduleConflicts)(events, true);
        strict_1.default.strictEqual(result.length, 1);
        strict_1.default.strictEqual(result[0].eventA.id, 'e1');
        strict_1.default.strictEqual(result[0].eventB.id, 'e2');
    });
    (0, node_test_1.default)('three events, all overlap → detects all pairs', () => {
        const events = [
            makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
            makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T10:15:00Z', end: '2026-03-10T11:15:00Z' }),
            makeEvent({ id: 'e3', childId: 'c3', coachId: 'coach3', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
        ];
        const result = (0, use_schedule_conflicts_1.detectScheduleConflicts)(events, true);
        // e1-e2, e1-e3, e2-e3 = 3 conflicts
        strict_1.default.strictEqual(result.length, 3);
    });
    (0, node_test_1.default)('same location (no coachId) → NOT a conflict', () => {
        const events = [
            makeEvent({ id: 'e1', childId: 'c1', location: 'Sports Centre', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
            makeEvent({ id: 'e2', childId: 'c2', location: 'Sports Centre', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
        ];
        const result = (0, use_schedule_conflicts_1.detectScheduleConflicts)(events, true);
        strict_1.default.strictEqual(result.length, 0);
    });
    (0, node_test_1.default)('different locations (no coachId) → CONFLICT', () => {
        const events = [
            makeEvent({ id: 'e1', childId: 'c1', location: 'Sports Centre', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
            makeEvent({ id: 'e2', childId: 'c2', location: 'Park Field', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
        ];
        const result = (0, use_schedule_conflicts_1.detectScheduleConflicts)(events, true);
        strict_1.default.strictEqual(result.length, 1);
    });
    (0, node_test_1.default)('one has coachId, other has same location but no coachId → uses location fallback', () => {
        // When one event has no coachId, falls back to location comparison
        const events = [
            makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', location: 'Sports Centre', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
            makeEvent({ id: 'e2', childId: 'c2', location: 'Sports Centre', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
        ];
        const result = (0, use_schedule_conflicts_1.detectScheduleConflicts)(events, true);
        // b has no coachId → location fallback kicks in → same location → NOT a conflict
        strict_1.default.strictEqual(result.length, 0);
    });
    (0, node_test_1.default)('overlapMinutes is calculated correctly — 30 min overlap', () => {
        const events = [
            makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
            makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
        ];
        const result = (0, use_schedule_conflicts_1.detectScheduleConflicts)(events, true);
        strict_1.default.strictEqual(result.length, 1);
        strict_1.default.strictEqual(result[0].overlapMinutes, 30);
    });
    (0, node_test_1.default)('overlapMinutes — fully contained event', () => {
        // e2 is fully inside e1
        const events = [
            makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T09:00:00Z', end: '2026-03-10T12:00:00Z' }),
            makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
        ];
        const result = (0, use_schedule_conflicts_1.detectScheduleConflicts)(events, true);
        strict_1.default.strictEqual(result.length, 1);
        strict_1.default.strictEqual(result[0].overlapMinutes, 60);
    });
    (0, node_test_1.default)('overlapMinutes — 15 min overlap', () => {
        const events = [
            makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T10:45:00Z' }),
            makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
        ];
        const result = (0, use_schedule_conflicts_1.detectScheduleConflicts)(events, true);
        strict_1.default.strictEqual(result.length, 1);
        strict_1.default.strictEqual(result[0].overlapMinutes, 15);
    });
    (0, node_test_1.default)('events without childId → excluded', () => {
        const events = [
            makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
            // childId is empty string — falsy
            makeEvent({ id: 'e2', childId: '', coachId: 'coach2', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
        ];
        const result = (0, use_schedule_conflicts_1.detectScheduleConflicts)(events, true);
        strict_1.default.strictEqual(result.length, 0);
    });
    (0, node_test_1.default)('unsorted input events still detected correctly', () => {
        // Provide events in reverse order — algorithm should sort internally
        const events = [
            makeEvent({ id: 'e2', childId: 'c2', coachId: 'coach2', start: '2026-03-10T10:30:00Z', end: '2026-03-10T11:30:00Z' }),
            makeEvent({ id: 'e1', childId: 'c1', coachId: 'coach1', start: '2026-03-10T10:00:00Z', end: '2026-03-10T11:00:00Z' }),
        ];
        const result = (0, use_schedule_conflicts_1.detectScheduleConflicts)(events, true);
        strict_1.default.strictEqual(result.length, 1);
        // After sorting, e1 should be eventA (earlier start)
        strict_1.default.strictEqual(result[0].eventA.id, 'e1');
        strict_1.default.strictEqual(result[0].eventB.id, 'e2');
    });
});
// ─── buildConflictsByEventId ────────────────────────────────────────────────
(0, node_test_1.describe)('buildConflictsByEventId', () => {
    (0, node_test_1.default)('empty conflicts → empty map', () => {
        const result = (0, use_schedule_conflicts_1.buildConflictsByEventId)([]);
        strict_1.default.strictEqual(result.size, 0);
    });
    (0, node_test_1.default)('single conflict → both event IDs indexed', () => {
        const eventA = makeEvent({ id: 'e1', childId: 'c1' });
        const eventB = makeEvent({ id: 'e2', childId: 'c2' });
        const conflict = { eventA, eventB, overlapMinutes: 30 };
        const result = (0, use_schedule_conflicts_1.buildConflictsByEventId)([conflict]);
        strict_1.default.strictEqual(result.size, 2);
        strict_1.default.strictEqual(result.get('e1')?.length, 1);
        strict_1.default.strictEqual(result.get('e2')?.length, 1);
        strict_1.default.strictEqual(result.get('e1')?.[0], conflict);
        strict_1.default.strictEqual(result.get('e2')?.[0], conflict);
    });
    (0, node_test_1.default)('event in multiple conflicts → all conflicts indexed', () => {
        const eventA = makeEvent({ id: 'e1', childId: 'c1' });
        const eventB = makeEvent({ id: 'e2', childId: 'c2' });
        const eventC = makeEvent({ id: 'e3', childId: 'c3' });
        const conflict1 = { eventA, eventB, overlapMinutes: 30 };
        const conflict2 = { eventA, eventB: eventC, overlapMinutes: 15 };
        const result = (0, use_schedule_conflicts_1.buildConflictsByEventId)([conflict1, conflict2]);
        // e1 is in both conflicts
        strict_1.default.strictEqual(result.get('e1')?.length, 2);
        // e2 is in one conflict
        strict_1.default.strictEqual(result.get('e2')?.length, 1);
        // e3 is in one conflict
        strict_1.default.strictEqual(result.get('e3')?.length, 1);
    });
    (0, node_test_1.default)('non-existent event ID returns undefined', () => {
        const result = (0, use_schedule_conflicts_1.buildConflictsByEventId)([]);
        strict_1.default.strictEqual(result.get('nonexistent'), undefined);
    });
});
